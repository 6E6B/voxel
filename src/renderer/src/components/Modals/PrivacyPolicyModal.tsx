import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
    DialogBody
} from '../UI/dialogs/Dialog'

interface PrivacyPolicyModalProps {
    isOpen: boolean
    onClose: () => void
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Privacy Policy</DialogTitle>
                    <DialogClose />
                </DialogHeader>
                <DialogBody className="overflow-y-auto pr-2">
                    <div className="space-y-6 text-neutral-300">
                        <div>
                            <p className="text-sm text-neutral-400 mb-4">Last Updated: December 2025</p>
                            <p className="text-base leading-relaxed">
                                Voxel ("we", "our", or "us") is committed to protecting your privacy. This Privacy
                                Policy explains how our open-source release of the Roblox launcher application
                                collects, uses, and discloses information.
                            </p>
                        </div>

                        <section className="space-y-3">
                            <h3 className="text-white font-semibold text-lg">1. Data Collection</h3>
                            <p className="text-sm leading-relaxed">
                                Voxel is designed to be privacy-first. We believe your data belongs to you.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-400">
                                <li>
                                    <strong className="text-neutral-200">No Personal Data Collection:</strong> We do
                                    not track your usage, collect personal identifiers, or store your browsing history
                                    on any remote servers controlled by us.
                                </li>
                                <li>
                                    <strong className="text-neutral-200">Local Storage:</strong> All sensitive data,
                                    including your account cookies, authentication tokens, settings, and logs, are
                                    stored securely on your local device.
                                </li>
                                <li>
                                    <strong className="text-neutral-200">Direct Communication:</strong> Voxel
                                    communicates directly with Roblox servers from your device. We do not proxy or
                                    inspect your traffic.
                                </li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h3 className="text-white font-semibold text-lg">2. Third-Party Services</h3>
                            <p className="text-sm leading-relaxed">
                                To function as a launcher, Voxel interacts with external services. Your use of these
                                services is governed by their respective privacy policies.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-400">
                                <li>
                                    <strong className="text-neutral-200">Roblox:</strong> When you log in or launch
                                    games, you are interacting directly with Roblox services. Please refer to{' '}
                                    <a
                                        href="https://en.help.roblox.com/hc/en-us/articles/115004630823-Roblox-Privacy-and-Cookie-Policy"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[var(--accent-color)] hover:underline"
                                    >
                                        Roblox's Privacy Policy
                                    </a>
                                    .
                                </li>
                                <li>
                                    <strong className="text-neutral-200">GitHub:</strong> We use GitHub's API to check
                                    for application updates. This may expose your IP address to GitHub when checking
                                    for updates.
                                </li>
                                <li>
                                    <strong className="text-neutral-200">Google Fonts:</strong> We may load fonts from
                                    Google Fonts if custom fonts are enabled.
                                </li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h3 className="text-white font-semibold text-lg">3. Security</h3>
                            <p className="text-sm leading-relaxed">
                                We implement local security measures to protect your data.
                            </p>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-neutral-400">
                                <li>
                                    <strong className="text-neutral-200">Encryption:</strong> Sensitive account data
                                    may be encrypted at rest on your device, depending on your OS capabilities.
                                </li>
                                <li>
                                    <strong className="text-neutral-200">Open Source:</strong> Our code is open
                                    source, allowing the community to audit and verify our security and privacy
                                    practices.
                                </li>
                            </ul>
                        </section>

                        <section className="space-y-3">
                            <h3 className="text-white font-semibold text-lg">4. Contact Us</h3>
                            <p className="text-sm leading-relaxed">
                                If you have any questions about this Privacy Policy or our practices, please open an
                                issue on our{' '}
                                <a
                                    href="https://github.com/6E6B/voxel/issues"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--accent-color)] hover:underline"
                                >
                                    GitHub Repository
                                </a>
                                .
                            </p>
                        </section>
                    </div>
                </DialogBody>
            </DialogContent>
        </Dialog>
    )
}

export default PrivacyPolicyModal
