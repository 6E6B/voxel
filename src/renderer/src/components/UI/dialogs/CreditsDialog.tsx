import React from 'react'
import { Heart, Github, ExternalLink } from 'lucide-react'
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
  { name: 'Nick', role: 'Lead Developer', link: 'https://github.com/crowsyndrome' },
  { name: 'fiveman1', role: '.rbxm / .rbxmx Parsers', link: 'https://github.com/fiveman1' },
  { name: 'Avis', role: 'Item sales count list', link: 'https://discord.gg/CX7m5RMwRr' }
]

const CreditsDialog: React.FC<CreditsDialogProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pl-0">
            <Heart size={20} className="text-red-400" />
            Credits
          </DialogTitle>
          <DialogClose />
        </DialogHeader>
        <DialogBody className="p-4">
          {credits.length > 0 ? (
            <div className="space-y-3">
              {credits.map((credit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{credit.name}</div>
                    <div className="text-xs text-neutral-400 truncate">{credit.role}</div>
                  </div>
                  {credit.link && (
                    <a
                      href={credit.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors ml-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {credit.link.includes('github') ? (
                        <Github size={16} />
                      ) : (
                        <ExternalLink size={16} />
                      )}
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Heart size={32} className="mx-auto text-neutral-600 mb-3" />
              <p className="text-neutral-400 text-sm">No credits added yet.</p>
              <p className="text-neutral-500 text-xs mt-1">
                Edit CreditsDialog.tsx to add contributors.
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-neutral-800">
            <p className="text-center text-xs text-neutral-500">
              Thank you to everyone who contributed! 💜
            </p>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default CreditsDialog
