import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSample } from '../data/sampleAnalyses';
import './Analysis.css';

const DemoAnalysis = () => {
  const { slug } = useParams();
  const sample = getSample(slug);
  const analysis = sample.analysis;
  const storageKey = `sample-clause-notes:${sample.slug}`;
  const [tab, setTab] = useState('overview');
  const [expandedClause, setExpandedClause] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState({});

  useEffect(() => {
    try {
      setNotes(JSON.parse(window.localStorage.getItem(storageKey)) || {});
    } catch {
      setNotes({});
    }
  }, [storageKey]);

  const saveNotes = (nextNotes) => {
    setNotes(nextNotes);
    window.localStorage.setItem(storageKey, JSON.stringify(nextNotes));
  };

  const handleAddNote = (clauseIndex) => {
    const text = noteText.trim();
    if (!text) return;
    const clauseNotes = notes[clauseIndex] || [];
    saveNotes({ ...notes, [clauseIndex]: [...clauseNotes, { text }] });
    setNoteText('');
  };

  const handleDeleteNote = (clauseIndex, noteIndex) => {
    const remaining = (notes[clauseIndex] || []).filter((_, index) => index !== noteIndex);
    saveNotes({ ...notes, [clauseIndex]: remaining });
  };

  const toggleClause = (index) => {
    setExpandedClause(expandedClause === index ? null : index);
    setNoteText('');
  };

  const riskLevel = analysis.overallRiskScore >= 80 ? 'critical' : analysis.overallRiskScore >= 60 ? 'high' : analysis.overallRiskScore >= 40 ? 'medium' : 'low';
  const elevatedClauses = analysis.clauses.filter(clause => ['high', 'critical'].includes(clause.riskLevel)).length;

  return (
    <div className="analysis-container">
      <header className="analysis-header">
        <div className="header-content">
          <div className="header-info">
            <h1>{sample.title}</h1>
          </div>
          <div className="header-actions">
            <Link className="btn btn-secondary btn-sm" to="/dashboard">Back to Dashboard</Link>
            <a className="btn btn-secondary btn-sm" href={sample.file} download>Download sample</a>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.4a1 1 0 00-.3-.7l-5.4-5.4a1 1 0 00-.7-.3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/><path d="M9 13h6M9 17h6"/></svg>
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="analysis-main">
        <div className="container">
          <div className={`risk-score-card risk-theme-${riskLevel}`}>
            <div className="risk-score-content">
              <h3>Overall Risk Score</h3>
              <div className={`risk-score risk-score-${riskLevel}`}>{analysis.overallRiskScore}</div>
              <p className="risk-score-label">out of 100</p>
            </div>
            <div className="risk-score-stats">
              <div className="stat-item"><span className="stat-value">{analysis.clauses.length}</span><span className="stat-label">Clauses reviewed</span></div>
              <div className="stat-item"><span className="stat-value stat-value-alert">{elevatedClauses}</span><span className="stat-label">Elevated clauses</span></div>
              <div className="stat-item"><span className="stat-value">{analysis.risks.length}</span><span className="stat-label">Risks found</span></div>
            </div>
          </div>

          <div className="analysis-tabs">
            {['overview', 'clauses', 'risks'].map(name => (
              <button key={name} className={`tab ${tab === name ? 'active' : ''}`} onClick={() => setTab(name)}>
                {name[0].toUpperCase() + name.slice(1)}{name === 'clauses' ? ` (${analysis.clauses.length})` : name === 'risks' ? ` (${analysis.risks.length})` : ''}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {tab === 'overview' && (
              <div className="overview-content">
                <section className="content-section"><h3>Executive Summary</h3><p className="summary-text">{analysis.summary}</p></section>
                <section className="content-section"><h3>Key Findings</h3><ul className="findings-list">{analysis.keyFindings.map(item => <li key={item}>{item}</li>)}</ul></section>
              </div>
            )}

            {tab === 'clauses' && (
              <div className="clauses-content">
                {analysis.clauses.map((clause, index) => (
                  <div className="clause-card" data-risk={clause.riskLevel} key={clause.text}>
                    <div className="clause-header">
                      <div className="clause-title"><h4>{clause.type}</h4><span className={`badge badge-risk-${clause.riskLevel}`}>{clause.riskLevel}</span></div>
                      <button className="expand-btn" onClick={() => toggleClause(index)} aria-label={`${expandedClause === index ? 'Close' : 'Open'} notes for ${clause.type}`}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: expandedClause === index ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M19 9l-7 7-7-7"/></svg>
                      </button>
                    </div>
                    <p className="clause-text">“{clause.text}”</p>
                    <p className="clause-explanation"><strong>Analysis:</strong> {clause.explanation}</p>

                    {expandedClause === index && (
                      <div className="clause-notes">
                        <h5>Notes</h5>
                        {(notes[index] || []).length > 0 ? (
                          <div className="notes-list">
                            {notes[index].map((note, noteIndex) => (
                              <div className="note-item" key={`${note.text}-${noteIndex}`}>
                                <p>{note.text}</p>
                                <button className="btn-icon btn-icon-danger" onClick={() => handleDeleteNote(index, noteIndex)} aria-label="Delete note">
                                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : <p className="no-notes">No notes yet</p>}
                        <div className="add-note">
                          <textarea placeholder="Add a note..." value={noteText} onChange={event => setNoteText(event.target.value)} rows="2" />
                          <button className="btn btn-primary btn-sm" disabled={!noteText.trim()} onClick={() => handleAddNote(index)}>Add Note</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'risks' && (
              <div className="risks-content">
                {analysis.risks.map(risk => (
                  <div className={`risk-card risk-${risk.severity}`} key={risk.description}>
                    <div className="risk-header"><span className={`badge badge-risk-${risk.severity}`}>{risk.severity}</span><h4>{risk.category}</h4></div>
                    <p>{risk.description}</p><p><strong>Recommendation:</strong> {risk.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <article className="print-report">
        <header className="print-report-header">
          <p>LEGAL DOCUMENT ANALYZER</p>
          <h1>{sample.title}</h1>
          <span>Pre-analyzed portfolio example</span>
        </header>
        <section className="print-score"><strong>{analysis.overallRiskScore}</strong><span>Overall risk score / 100</span></section>
        <section><h2>Executive Summary</h2><p>{analysis.summary}</p></section>
        <section><h2>Key Findings</h2><ul>{analysis.keyFindings.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section><h2>Clause Analysis</h2>{analysis.clauses.map((clause, index) => <div className="print-item" key={clause.text}><h3>{index + 1}. {clause.type.replaceAll('_', ' ')} — {clause.riskLevel}</h3><p><strong>Clause:</strong> “{clause.text}”</p><p><strong>Analysis:</strong> {clause.explanation}</p>{(notes[index] || []).map((note, noteIndex) => <p key={noteIndex}><strong>Note:</strong> {note.text}</p>)}</div>)}</section>
        <section><h2>Risk Register</h2>{analysis.risks.map((risk, index) => <div className="print-item" key={risk.description}><h3>{index + 1}. {risk.category} — {risk.severity}</h3><p><strong>Issue:</strong> {risk.description}</p><p><strong>Recommendation:</strong> {risk.recommendation}</p></div>)}</section>
        <footer>Portfolio example • AI-assisted analysis is not legal advice.</footer>
      </article>
    </div>
  );
};

export default DemoAnalysis;
