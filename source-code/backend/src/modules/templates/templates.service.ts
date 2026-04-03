import { Injectable, NotFoundException } from '@nestjs/common';

export type GameTemplate = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  defaultConfig: Record<string, unknown>;
};

export const GAME_TEMPLATES: readonly GameTemplate[] = [
  {
    id: 'snake',
    name: 'Rắn săn mồi',
    description: 'Điều khiển rắn ăn mồi, tránh đâm tường',
    thumbnail: '/templates/snake.png',
    category: 'classic',
    defaultConfig: {
      speed: 150,
      gridSize: 20,
      backgroundColor: '#1a1a2e',
      snakeColor: '#00ff88',
      foodColor: '#ff4444',
    },
  },
  {
    id: 'flappy',
    name: 'Flappy Bird',
    description: 'Bay qua các ống, tránh va chạm',
    thumbnail: '/templates/flappy.png',
    category: 'arcade',
    defaultConfig: {
      gravity: 800,
      flapForce: -350,
      pipeSpeed: 200,
      backgroundColor: '#87CEEB',
      birdColor: '#FFD700',
      pipeColor: '#228B22',
    },
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Phá vỡ các khối gạch bằng bóng',
    thumbnail: '/templates/breakout.png',
    category: 'classic',
    defaultConfig: {
      ballSpeed: 300,
      paddleSpeed: 400,
      backgroundColor: '#0f0f23',
      ballColor: '#ffffff',
      paddleColor: '#00aaff',
      brickColors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00'],
    },
  },
  {
    id: 'platformer',
    name: 'Platformer',
    description: 'Chạy nhảy qua các platform, nhặt coins',
    thumbnail: '/templates/platformer.png',
    category: 'platformer',
    defaultConfig: {
      gravity: 600,
      jumpForce: -500,
      speed: 200,
      backgroundColor: '#87CEEB',
      playerColor: '#FF6B6B',
      platformColor: '#4ECDC4',
      coinColor: '#FFE66D',
    },
  },
  {
    id: 'shooter',
    name: 'Top-down Shooter',
    description: 'Bắn hạ kẻ thù, sống sót qua các wave',
    thumbnail: '/templates/shooter.png',
    category: 'action',
    defaultConfig: {
      playerSpeed: 200,
      bulletSpeed: 400,
      enemySpeed: 80,
      backgroundColor: '#1a1a2e',
      playerColor: '#00ff88',
      bulletColor: '#ffffff',
      enemyColor: '#ff4444',
    },
  },
  {
    id: 'memory',
    name: 'Lật bài nhớ',
    description: 'Tìm các cặp bài giống nhau',
    thumbnail: '/templates/memory.png',
    category: 'puzzle',
    defaultConfig: {
      timeLimit: 60,
      gridSize: 4,
      backgroundColor: '#2d3436',
      cardBackColor: '#6c5ce7',
      cardColors: [
        '#e17055',
        '#00b894',
        '#0984e3',
        '#fdcb6e',
        '#e84393',
        '#00cec9',
        '#fd79a8',
        '#55efc4',
      ],
    },
  },
];

@Injectable()
export class TemplatesService {
  findAll(): GameTemplate[] {
    return [...GAME_TEMPLATES];
  }

  findOne(id: string): GameTemplate {
    const template = GAME_TEMPLATES.find((t) => t.id === id);
    if (!template) {
      throw new NotFoundException(`Không tìm thấy template: ${id}`);
    }
    return { ...template, defaultConfig: { ...template.defaultConfig } };
  }
}
