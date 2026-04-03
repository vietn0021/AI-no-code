import { useCallback, useEffect, useState } from 'react'

import toast from 'react-hot-toast'

import { Send } from 'lucide-react'

import { getApiErrorMessage } from '../../lib/api'

import { useAuth } from '../../hooks/useAuth'

import {

  normalizeGameConfigForEditor,

  postProjectGenerate,

} from '../../services/projects.api'

import { getPrompts, saveMessage } from '../../services/prompts.api'

import { useEditorStore } from '../../store/useEditorStore'

import { cn } from '../../lib/utils'



const HISTORY_DISPLAY_CAP = 50



type ChatMessage = {

  id: string

  role: 'user' | 'assistant'

  text: string

  /** Tin “AI đang xử lý…” — có thể style nhẹ */

  pending?: boolean

  /** Dòng phân cách lịch sử */

  divider?: boolean

}



type AiChatPanelProps = {

  projectId?: string

}



/** Nhãn hiển thị khi AI trả về templateId (khớp runtime trong GameRuntime). */

function templateLabelForChat(templateId: string): string {

  const key = templateId.trim().toLowerCase()

  const map: Record<string, string> = {

    snake: 'Snake',

    flappy: 'Flappy Bird',

    breakout: 'Breakout',

    platformer: 'Platformer',

    shooter: 'Top-down Shooter',

    memory: 'Lật bài nhớ',

  }

  return map[key] ?? templateId.trim()

}



function HistorySkeleton() {

  return (

    <div className="space-y-3 px-3 py-3" aria-hidden>

      <div className="flex animate-pulse justify-end">

        <div className="h-10 w-[62%] rounded-2xl rounded-br-md bg-white/25 shadow-sm ring-1 ring-white/20" />

      </div>

      <div className="flex animate-pulse justify-start">

        <div className="h-14 w-[78%] rounded-2xl rounded-bl-md bg-sky-dark/15 shadow-sm ring-1 ring-sky-dark/10" />

      </div>

      <div className="flex animate-pulse justify-end">

        <div className="h-9 w-[48%] rounded-2xl rounded-br-md bg-white/25 shadow-sm ring-1 ring-white/20" />

      </div>

    </div>

  )

}



export function AiChatPanel({ projectId }: AiChatPanelProps) {

  const { token } = useAuth()

  const gameConfig = useEditorStore((s) => s.gameConfig)

  const setGameConfig = useEditorStore((s) => s.setGameConfig)

  const setTemplateId = useEditorStore((s) => s.setTemplateId)

  const setLoading = useEditorStore((s) => s.setLoading)



  const [messages, setMessages] = useState<ChatMessage[]>([])

  const [prompt, setPrompt] = useState('')

  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const [historyVisible, setHistoryVisible] = useState(false)



  const isLoading = useEditorStore((s) => s.isLoading)



  useEffect(() => {

    if (!projectId || !token) {

      setMessages([])

      setIsLoadingHistory(false)

      setHistoryVisible(false)

      return

    }

    const pid = projectId



    async function loadHistory() {

      setIsLoadingHistory(true)

      setHistoryVisible(false)

      try {

        const history = await getPrompts(pid)

        const capped = history.slice(-HISTORY_DISPLAY_CAP)

        const mapped: ChatMessage[] = capped.map((p) => ({

          id: p._id,

          role: p.role,

          text: p.content,

        }))

        if (history.length >= HISTORY_DISPLAY_CAP) {

          mapped.unshift({

            id: 'history-cap-divider',

            role: 'assistant',

            text: '--- Lịch sử trước đó ---',

            divider: true,

          })

        }

        setMessages(mapped)

      } catch {

        setMessages([])

      } finally {

        setIsLoadingHistory(false)

      }

    }



    void loadHistory()

  }, [projectId, token])



  useEffect(() => {

    if (isLoadingHistory) {

      setHistoryVisible(false)

      return

    }

    const id = requestAnimationFrame(() => setHistoryVisible(true))

    return () => cancelAnimationFrame(id)

  }, [isLoadingHistory])



  const send = useCallback(async () => {

    const text = prompt.trim()

    if (!text) return

    if (!projectId) {

      toast.error('Thiếu projectId trên URL.')

      return

    }

    const activeProjectId = projectId

    if (!token) {

      toast.error('Vui lòng đăng nhập lại.')

      return

    }

    if (text.length < 3) {

      toast.error('Prompt cần ít nhất 3 ký tự.')

      return

    }



    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text }



    const entities = Array.isArray(gameConfig.entities) ? gameConfig.entities : []

    const hasExistingBehaviors = entities.some(

      (e) => Array.isArray(e.behaviors) && e.behaviors.length > 0,

    )

    const tidRaw =

      typeof gameConfig.templateId === 'string' ? gameConfig.templateId.trim() : ''

    const hasTemplate = tidRaw.length > 0

    const guidance =

      hasTemplate && !hasExistingBehaviors

        ? `Đang dùng template: ${tidRaw}

Nếu yêu cầu chỉ thay đổi màu sắc/tốc độ

→ CHỈ update templateConfig, giữ templateId



Nếu yêu cầu thay đổi game mechanic/behavior

→ Chuyển sang behavior system:

Xóa templateId, thêm behaviors[] cho từng entity`

        : `Ưu tiên dùng behavior system.

Mỗi entity phải có behaviors[] phù hợp.

Không dùng templateId.`



    const contextPrompt = `

Scene hiện tại:

${JSON.stringify(gameConfig, null, 2)}



Yêu cầu: ${text}



HƯỚNG DẪN TRẢ VỀ:

${guidance}



Các behavior hợp lệ:

move, patrol, follow, bounce, circular,

gravity, jump, float,

shoot, onCollide, onCollect,

spawnRandom, spawnOnTimer



Actions: addScore, loseLife, gameOver, winGame



Giữ nguyên những gì không cần thay đổi.

`.trim()

    const loadingId = `loading-${Date.now()}`

    const loadingMsg: ChatMessage = {

      id: loadingId,

      role: 'assistant',

      text: 'AI đang xử lý…',

      pending: true,

    }



    setMessages((m) => [...m, userMsg, loadingMsg])

    setLoading(true)



    try {

      const project = await postProjectGenerate(activeProjectId, contextPrompt)

      const rawConfig = project.gameConfig

      if (rawConfig == null) {

        throw new Error('Máy chủ không trả về gameConfig')

      }

      const normalized = normalizeGameConfigForEditor(rawConfig)

      setGameConfig(normalized)

      const tid =

        typeof normalized.templateId === 'string' ? normalized.templateId.trim() : ''

      if (tid) {

        setTemplateId(tid)

      }

      setPrompt('')

      const assistantText = tid

        ? `Đã cập nhật ${templateLabelForChat(tid)}.\nNhấn Play để chơi 🎮`

        : 'Đã cập nhật scene theo prompt của bạn.'

      setMessages((m) =>

        m

          .filter((x) => x.id !== loadingId)

          .concat({

            id: `a-${Date.now()}`,

            role: 'assistant',

            text: assistantText,

          }),

      )



      try {

        await saveMessage(activeProjectId, 'user', text)

        await saveMessage(activeProjectId, 'assistant', assistantText)

      } catch {

        /* persist thất bại không chặn UI */

      }

    } catch (e) {

      setMessages((m) => m.filter((x) => x.id !== loadingId))

      toast.error(getApiErrorMessage(e))

    } finally {

      setLoading(false)

    }

  }, [prompt, projectId, token, gameConfig, setGameConfig, setTemplateId, setLoading])



  return (

    <>

      <div className="relative min-h-0 flex-1 overflow-y-auto">

        {isLoadingHistory ? (

          <HistorySkeleton />

        ) : (

          <div

            className={cn(

              'space-y-3 px-3 py-3 transition-opacity duration-500 ease-out',

              historyVisible ? 'opacity-100' : 'opacity-0',

            )}

          >

            {messages.map((m) =>

              m.divider ? (

                <div

                  key={m.id}

                  className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400/90"

                >

                  {m.text}

                </div>

              ) : m.role === 'user' ? (

                <div key={m.id} className="flex justify-end">

                  <div className="max-w-[92%] rounded-2xl rounded-br-md bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-white/60">

                    {m.text}

                  </div>

                </div>

              ) : (

                <div key={m.id} className="flex justify-start">

                  <div

                    className={

                      m.pending

                        ? 'max-w-[92%] rounded-2xl rounded-bl-md bg-sky-light/85 px-3 py-2 text-sm text-slate-800 shadow-sm ring-1 ring-sky-dark/15 italic text-slate-600'

                        : 'max-w-[92%] rounded-2xl rounded-bl-md bg-sky-light/85 px-3 py-2 text-sm text-slate-800 shadow-sm ring-1 ring-sky-dark/15'

                    }

                  >

                    {m.text}

                  </div>

                </div>

              ),

            )}

          </div>

        )}

      </div>



      <div className="glass-surface shrink-0 border-t border-white/50 p-3">

        <div className="flex gap-2 rounded-xl border border-white/50 bg-white/50 p-1.5 shadow-inner">

          <textarea

            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-lg bg-transparent px-2 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-dark/25 disabled:opacity-60"

            placeholder="Nhập lệnh cho AI…"

            rows={2}

            value={prompt}

            disabled={isLoading}

            onChange={(e) => setPrompt(e.target.value)}

            onKeyDown={(e) => {

              if (e.key === 'Enter' && !e.shiftKey) {

                e.preventDefault()

                void send()

              }

            }}

          />

          <button

            type="button"

            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl bg-sky-dark text-white shadow-soft transition hover:brightness-105 hover:shadow-soft-hover disabled:pointer-events-none disabled:opacity-50"

            aria-label="Gửi"

            disabled={isLoading || !prompt.trim() || !projectId}

            onClick={() => void send()}

          >

            <Send className="h-4 w-4" />

          </button>

        </div>

      </div>

    </>

  )

}

