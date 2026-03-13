import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createReward } from '../api/rewards'
import { useKboard } from '../hooks/useKboard'

export default function RequestRewardModal({ onClose }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')

  const nameKb = useKboard(name, setName)
  const descKb  = useKboard(description, setDescription)
  const linkKb  = useKboard(link, setLink)

  const { mutate, isPending } = useMutation({
    mutationFn: () => createReward({
      name,
      description: description || undefined,
      link: link || undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'child'] })
      onClose()
    }
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-96 flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Request a Reward</h2>

        <input value={name} {...nameKb}
          placeholder="What do you want?"
          className="bg-white/10 rounded-xl px-4 py-2 text-sm outline-none" />

        <textarea value={description} {...descKb}
          placeholder="Any details... (optional)" rows={2}
          className="bg-white/10 rounded-xl px-4 py-2 text-sm outline-none resize-none" />

        <input value={link} {...linkKb}
          placeholder="Link (optional)"
          className="bg-white/10 rounded-xl px-4 py-2 text-sm outline-none" />

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/50 active:text-white/80">
            Cancel
          </button>
          <button onClick={() => mutate()} disabled={!name.trim() || isPending}
            className="px-4 py-2 rounded-xl bg-indigo-600/80 text-sm font-medium disabled:opacity-40 active:bg-indigo-600">
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
