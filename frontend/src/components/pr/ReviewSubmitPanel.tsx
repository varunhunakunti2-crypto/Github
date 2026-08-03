'use client';

import React, { useState } from 'react';

interface ReviewSubmitPanelProps {
  owner: string;
  repo: string;
  prNumber: number;
  isAuthor: boolean;
  onSubmitSuccess: () => void;
}

export default function ReviewSubmitPanel({
  owner,
  repo,
  prNumber,
  isAuthor,
  onSubmitSuccess,
}: ReviewSubmitPanelProps) {
  const [outcome, setOutcome] = useState<'comment' | 'approve' | 'request_changes'>('comment');
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthor && (outcome === 'approve' || outcome === 'request_changes')) {
      setError('You cannot approve or request changes on your own pull request.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/pulls/${prNumber}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          event: outcome.toUpperCase(),
          body: summary,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to submit review');
      }

      setSummary('');
      setOutcome('comment');
      onSubmitSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#14171C] border border-[#232830] rounded-lg p-4 flex flex-col gap-4 font-sans text-xs">
      <div>
        <span className="font-bold text-gray-300 uppercase tracking-wider">Submit Review</span>
        <p className="text-gray-500 mt-0.5">Provide feedback, approve changes, or request modifications.</p>
      </div>

      {error && (
        <div className="p-2.5 bg-red-950/20 border border-red-500/30 text-red-400 rounded">
          {error}
        </div>
      )}

      {/* Summary Comment */}
      <div className="flex flex-col gap-1.5">
        <label className="font-bold text-gray-400 uppercase">Review Summary (Optional)</label>
        <textarea
          rows={3}
          placeholder="Leave an overall comment on this review..."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="bg-[#0B0D10] border border-[#232830] rounded p-2.5 text-gray-200 focus:outline-none focus:border-[#7C5CFF]"
        />
      </div>

      {/* Radio options */}
      <div className="flex flex-col gap-2.5 border-t border-b border-[#232830] py-3">
        {/* Comment */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="radio"
            name="outcome"
            value="comment"
            checked={outcome === 'comment'}
            onChange={() => setOutcome('comment')}
            className="mt-0.5"
          />
          <div className="flex flex-col">
            <span className="font-bold text-gray-300">Comment</span>
            <span className="text-gray-500 text-[10px]">Submit general feedback without approving or requesting changes.</span>
          </div>
        </label>

        {/* Approve */}
        <label className={`flex items-start gap-2.5 ${isAuthor ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="radio"
            name="outcome"
            value="approve"
            checked={outcome === 'approve'}
            disabled={isAuthor}
            onChange={() => setOutcome('approve')}
            className="mt-0.5"
          />
          <div className="flex flex-col">
            <span className={`font-bold ${outcome === 'approve' ? 'text-green-400' : 'text-gray-300'}`}>Approve</span>
            <span className="text-gray-500 text-[10px]">Submit feedback and approve merging these changes.</span>
          </div>
        </label>

        {/* Request changes */}
        <label className={`flex items-start gap-2.5 ${isAuthor ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="radio"
            name="outcome"
            value="request_changes"
            checked={outcome === 'request_changes'}
            disabled={isAuthor}
            onChange={() => setOutcome('request_changes')}
            className="mt-0.5"
          />
          <div className="flex flex-col">
            <span className={`font-bold ${outcome === 'request_changes' ? 'text-red-400' : 'text-gray-300'}`}>Request Changes</span>
            <span className="text-gray-500 text-[10px]">Submit feedback that must be addressed before merging.</span>
          </div>
        </label>

        {isAuthor && (
          <span className="text-amber-500 text-[10px] italic mt-1">
            ⚠️ You are the author of this Pull Request. Self-approval is disabled.
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-[#7C5CFF] text-white py-2 px-4 rounded font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
      >
        {submitting ? 'Submitting review...' : 'Submit review'}
      </button>
    </form>
  );
}
