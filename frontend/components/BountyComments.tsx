'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { listComments, postComment } from '@/lib/api';
import { MessageSquare, Send, User, Clock, Loader2 } from 'lucide-react';

interface Comment {
  id: string;
  wallet_address: string;
  text: string;
  created_at: string;
}

export default function BountyComments() {
  const { id: bountyId } = useParams();
  const { wallet } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (bountyId) fetchComments();
  }, [bountyId]);

  async function fetchComments() {
    try {
      const res = await listComments(bountyId as string);
      if (res.success) {
        setComments(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !wallet) return;

    setSending(true);
    try {
      const res = await postComment(bountyId as string, newComment);
      if (res.success) {
        setComments([...comments, res.data]);
        setNewComment('');
      }
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <MessageSquare size={18} color="var(--accent-primary)" />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Requirements Clarification</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {comments.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center' }}>No inquiries recorded for this mission yet.</p>
        ) : (
          comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: '12px', borderLeft: '2px solid var(--border-color)', paddingLeft: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {c.wallet_address === wallet ? 'YOU (Verified)' : c.wallet_address.slice(0, 10) + '...'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {wallet ? (
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
          <input 
            className="input" 
            placeholder="Ask for mission clarification..." 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={sending}
          />
          <button className="btn btn-primary btn-sm" disabled={sending || !newComment.trim()}>
            {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
            Post
          </button>
        </form>
      ) : (
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Connect wallet to participate in mission clarification.</p>
      )}
    </div>
  );
}
