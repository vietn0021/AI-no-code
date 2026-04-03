import { motion } from 'framer-motion'
import type { Project } from '../../../services/projects.api'
import { ProjectCard } from './ProjectCard'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.08,
    },
  },
}

type ProjectGridProps = {
  projects: Project[]
  onProjectDeleted?: () => void
}

export function ProjectGrid({ projects, onProjectDeleted }: ProjectGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      key={projects.map((p) => p.id).join(',')}
    >
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onDeleted={onProjectDeleted} />
      ))}
    </motion.div>
  )
}
