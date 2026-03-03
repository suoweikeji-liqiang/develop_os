'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Check, X, Pencil } from 'lucide-react'

type AssumptionCardState = 'pending' | 'accepting' | 'rejecting' | 'done'

export interface PendingAssumption {
  id: string
  content: string
  confidence: 'high' | 'medium' | 'low'
  rationale: string
}

export interface AssumptionCardAction {
  type: 'accept' | 'reject'
  finalContent?: string
  rejectReason?: string
}

interface Props {
  assumption: PendingAssumption
  onAction: (action: AssumptionCardAction) => void
}

const confidenceColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-red-100 text-red-800',
}

const confidenceLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export function AssumptionCard({ assumption, onAction }: Props) {
  const [cardState, setCardState] = useState<AssumptionCardState>('pending')
  const [editText, setEditText] = useState(assumption.content)
  const [rejectReason, setRejectReason] = useState('')

  if (cardState === 'done') {
    return (
      <div className="rounded-md border p-3 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">{editText || assumption.content}</span>
          <Badge variant="outline" className={confidenceColors[assumption.confidence] ?? ''}>
            {confidenceLabels[assumption.confidence] ?? assumption.confidence}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{assumption.rationale}</p>
      </div>
    )
  }

  if (cardState === 'accepting') {
    return (
      <div className="ring-2 ring-amber-400 bg-amber-50 rounded-md p-3 space-y-2">
        <Textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={3}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onAction({ type: 'accept', finalContent: editText })
              setCardState('done')
            }}
          >
            <Check className="h-4 w-4 mr-1" />
            确认
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCardState('pending')}
          >
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
        </div>
      </div>
    )
  }

  if (cardState === 'rejecting') {
    return (
      <div className="ring-2 ring-amber-400 bg-amber-50 rounded-md p-3 space-y-2">
        <p className="text-sm">{assumption.content}</p>
        <Textarea
          placeholder="说明原因或提供修正版本..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={2}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onAction({ type: 'reject', rejectReason })
              setCardState('done')
            }}
          >
            <Check className="h-4 w-4 mr-1" />
            确认
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCardState('pending')}
          >
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
        </div>
      </div>
    )
  }

  // pending state
  return (
    <div className="ring-2 ring-amber-400 bg-amber-50 rounded-md p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm">{assumption.content}</span>
        <Badge variant="outline" className={confidenceColors[assumption.confidence] ?? ''}>
          {confidenceLabels[assumption.confidence] ?? assumption.confidence}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{assumption.rationale}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setCardState('accepting')}>
          <Check className="h-4 w-4 mr-1" />
          接受
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCardState('rejecting')}>
          <X className="h-4 w-4 mr-1" />
          拒绝
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCardState('accepting')}>
          <Pencil className="h-4 w-4 mr-1" />
          编辑
        </Button>
      </div>
    </div>
  )
}
