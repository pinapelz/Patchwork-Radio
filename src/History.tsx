import React from "react";
import type { HistoryItem } from "../types";

interface Props {
  history?: HistoryItem[];
}

export default function History({ history = [] }: Props) {
  return (
    <aside className="history card">
      <h3>Listening History</h3>

      {/* Inline component-level styles for link & badge visuals */}
      <style>{`
        /* clickable title hover */
        .history-link:hover .history-title {
          text-decoration: underline;
          color: var(--accent);
          transform: translateY(-1px);
        }

        /* video id badge */
        .video-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          color: var(--accent);
          font-weight: 700;
          font-size: 0.75rem;
          border: 1px solid rgba(255,255,255,0.03);
          transition: transform 120ms ease, box-shadow 120ms ease;
        }

        .video-badge:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 18px rgba(0,0,0,0.5);
        }

        /* small muted style when no video id */
        .video-badge.placeholder {
          color: var(--muted);
          background: rgba(255,255,255,0.01);
          border-style: dashed;
        }

        /* ensure title & badge layout */
        .history-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
      `}</style>

      {history.length === 0 ? (
        <div className="history-empty">No history yet.</div>
      ) : (
        <ul className="history-list">
          {history.map((item, i) => (
            <li key={i} className="history-item">
              <a className="history-link" href={`https://patchwork.moekyun.me/watch?v=${item.videoId ?? ""}`} target="_blank" rel="noopener noreferrer">
                <div className="history-body">
                  <div className="history-title-row">
                    <div className="history-title">{item.title}</div>
                    {item.videoId ? (
                      <a
                        className="video-badge"
                        href={`https://patchwork.moekyun.me/watch?v=${item.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Watch video ${item.videoId}`}
                      >
                        {item.videoId}
                      </a>
                    ) : (
                      <span className="video-badge placeholder">no id</span>
                    )}
                  </div>

                  <div className="history-meta">
                    <span className="history-artist">{item.artist}</span>
                    <span className="history-time">{item.time}</span>
                  </div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
