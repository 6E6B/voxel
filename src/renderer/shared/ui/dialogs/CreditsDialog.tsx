import React from 'react'
import { Github, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogBody } from './Dialog'

interface Credit {
  name: string
  role: string
  link?: string
}

interface CreditsDialogProps {
  isOpen: boolean
  onClose: () => void
}

const credits: Credit[] = [
  { name: 'Nick', role: 'Lead developer', link: 'https://github.com/crowsyndrome' },
  { name: 'fiveman1', role: '.rbxm / .rbxmx Parsers', link: 'https://github.com/fiveman1' },
  { name: 'Avis', role: 'Item sales count list', link: 'https://discord.gg/CX7m5RMwRr' },
  { name: 'Julia (RoSeal)', role: 'Roblox-BAT library', link: 'https://github.com/juliaoverflow' }
]

const CreditsDialog: React.FC<CreditsDialogProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Credits</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogBody>
          {credits.length > 0 ? (
            <div className="space-y-1">
              {credits.map((credit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[var(--color-text-primary)] text-sm truncate">{credit.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)] truncate">{credit.role}</div>
                  </div>
                  {credit.link && (
                    <a
                      href={credit.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors ml-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {credit.link.includes('github') ? (
                        <Github size={14} />
                      ) : (
                        <ExternalLink size={14} />
                      )}
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-[var(--color-text-muted)] text-sm">No credits added yet.</p>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default CreditsDialog
