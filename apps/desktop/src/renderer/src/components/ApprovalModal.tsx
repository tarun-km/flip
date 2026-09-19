import type { ApprovalRequest } from '@klip/contracts';

export interface ApprovalModalProps {
  request: ApprovalRequest;
  onResolve: (decision: 'approve' | 'reject') => void;
}

/**
 * R3 approval (docs/09-SECURITY-TRUST.md section 4, docs/07-DESIGN-GUIDEBOOK.md
 * section 8). Shows the exact action/content; approve and reject have equal
 * visual weight; neither Enter nor voice auto-approves.
 */
export function ApprovalModal({ request, onResolve }: ApprovalModalProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="klip-approval-title"
      data-no-drag
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(6, 8, 10, 0.72)',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 12,
        zIndex: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          background: 'var(--klip-raised)',
          border: '1px solid var(--klip-attention)',
          borderRadius: 14,
          padding: 14,
          maxHeight: '80%',
          overflowY: 'auto',
        }}
      >
        <div id="klip-approval-title" style={{ fontSize: 13, fontWeight: 700, color: 'var(--klip-attention)', marginBottom: 6 }}>
          Approval needed
        </div>
        <div style={{ fontSize: 13, marginBottom: 8 }}>{request.summary}</div>

        <div style={{ fontSize: 11, color: 'var(--klip-text-secondary)', marginBottom: 4 }}>Exact action</div>
        <pre
          style={{
            fontSize: 11,
            background: '#0c0f13',
            padding: 8,
            borderRadius: 8,
            overflowX: 'auto',
            maxHeight: 140,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(request.exactAction, null, 2)}
        </pre>

        {request.affectedResources.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--klip-text-secondary)', marginTop: 8 }}>
            Affects: {request.affectedResources.join(', ')}
          </div>
        )}

        <div style={{ fontSize: 10, color: 'var(--klip-text-secondary)', marginTop: 6 }}>Expires {new Date(request.expiresAt).toLocaleTimeString()}</div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            onClick={() => onResolve('reject')}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--klip-error)', background: 'transparent', color: 'var(--klip-error)', fontWeight: 600 }}
          >
            Reject
          </button>
          <button
            onClick={() => onResolve('approve')}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'var(--klip-accent)', color: '#0c1013', fontWeight: 700 }}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
