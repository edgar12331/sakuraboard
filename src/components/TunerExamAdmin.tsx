import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Unlock, Eye, Trash2, CheckCircle, Lock, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { EXAM_QUESTIONS } from './TunerExam';

const API_URL = import.meta.env.VITE_API_URL || 'https://sakura-bot-fkih.onrender.com/api';

interface ExamRecord {
    user_id: string;
    username: string;
    avatar: string;
    ausbilder: string;
    status: 'locked' | 'unlocked' | 'submitted';
    score: number;
    answers: any;
    created_at: string;
    updated_at: string;
}

export function TunerExamAdmin() {
    const [exams, setExams] = useState<ExamRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewExam, setViewExam] = useState<ExamRecord | null>(null);

    const fetchExams = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.get(`${API_URL}/admin/tuner-exams`);
            setExams(res.data);
        } catch (err) {
            console.error('Failed to load exams', err);
            setError('Fehler beim Laden der Prüfungsdaten.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const handleUnlock = async (id: string, name: string) => {
        if (!confirm(`Möchtest du die Prüfung für ${name} freischalten?`)) return;
        try {
            await axios.post(`${API_URL}/admin/tuner-exams/${id}/unlock`);
            fetchExams();
        } catch (err) {
            alert('Fehler beim Freischalten.');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Soll der Prüfungsdatensatz von ${name} wirklich gelöscht werden? Dies kann nicht rückgängig gemacht werden.`)) return;
        try {
            await axios.delete(`${API_URL}/admin/tuner-exams/${id}`);
            if (viewExam?.user_id === id) setViewExam(null);
            fetchExams();
        } catch (err) {
            alert('Fehler beim Löschen.');
        }
    };

    if (viewExam) {
        return (
            <div className="admin-section">
                <div className="section-header" style={{ marginBottom: '24px' }}>
                    <div>
                        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Zurücksetzen & Auswertung: {viewExam.username}
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Ausbilder: {viewExam.ausbilder || 'Unbekannt'} | Eingereicht am: {format(new Date(viewExam.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setViewExam(null)}>
                        <X size={16} style={{ marginRight: '8px' }} /> Schließen
                    </button>
                </div>

                <div className="surface" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                        Gegebene Antworten
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {EXAM_QUESTIONS.map((q, idx) => {
                            const ansArray = viewExam.answers ? viewExam.answers[q.id] : null;
                            const isArray = Array.isArray(ansArray);
                            const currentAnswers = ansArray ? (isArray ? (ansArray as unknown as string[]) : [String(ansArray)]) : [];

                            return (
                                <div key={q.id} className="tuner-exam-answers-box" style={{ padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div className="tuner-exam-answer-label" style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                        {idx + 1}. {q.text}
                                        <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)', marginLeft: '8px' }}>({q.points} Pkt)</span>
                                    </div>
                                    <div className="tuner-exam-answer-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {currentAnswers.length > 0 ? currentAnswers.map((ans, i) => (
                                            <span key={i} className="tuner-exam-answer-tag" style={{ background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', border: '1px solid var(--border)' }}>
                                                {ans}
                                            </span>
                                        )) : (
                                            <span style={{ color: '#ff4757', fontSize: '12px', fontStyle: 'italic' }}>Keine Antwort gegeben</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-section">
            <div className="section-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h2 className="section-title">Tunerprüfung Verwaltung</h2>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Hier siehst du alle Anfragen und eingereichten Prüfungen.</p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchExams} disabled={isLoading}>
                    <RefreshCw size={14} style={{ marginRight: '8px' }} className={isLoading ? 'animate-spin' : ''} /> Aktualisieren
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', color: '#ff4757', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', marginBottom: '24px', fontSize: '13px' }}>
                    <AlertCircle size={16} style={{ marginRight: '8px' }} /> {error}
                </div>
            )}

            <div className="tuner-admin-table-wrapper">
                <table className="tuner-admin-table">
                    <thead>
                        <tr>
                            <th>Benutzer</th>
                            <th>Status</th>
                            <th>Letztes Update</th>
                            <th style={{ textAlign: 'right' }}>Aktionen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {exams.length === 0 && !isLoading ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Keine Prüfungsdatensätze gefunden.
                                </td>
                            </tr>
                        ) : (
                            exams.map((exam) => (
                                <tr key={exam.user_id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {exam.avatar ? (
                                                <img src={`https://cdn.discordapp.com/avatars/${exam.user_id}/${exam.avatar}.png`} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)' }} alt="" />
                                            ) : (
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                                    {exam.username.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: '600' }}>{exam.username}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{exam.user_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        {exam.status === 'locked' && (
                                            <span className="status-badge locked">
                                                <Lock size={12} /> Gesperrt
                                            </span>
                                        )}
                                        {exam.status === 'unlocked' && (
                                            <span className="status-badge unlocked">
                                                <Unlock size={12} /> Schreibt...
                                            </span>
                                        )}
                                        {exam.status === 'submitted' && (
                                            <span className="status-badge submitted">
                                                <CheckCircle size={12} /> Abgegeben
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                        {format(new Date(exam.updated_at), 'dd.MM.yy HH:mm')}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                            {exam.status === 'locked' && (
                                                <button
                                                    onClick={() => handleUnlock(exam.user_id, exam.username)}
                                                    className="btn btn-primary btn-sm"
                                                    title="Prüfung freischalten"
                                                >
                                                    <Unlock size={14} style={{ marginRight: '6px' }} /> Freischalten
                                                </button>
                                            )}
                                            {exam.status === 'submitted' && (
                                                <button
                                                    onClick={() => {
                                                        let parsedAnswers = exam.answers;
                                                        if (typeof parsedAnswers === 'string') {
                                                            try { parsedAnswers = JSON.parse(parsedAnswers); } catch (e) { parsedAnswers = {}; }
                                                        }
                                                        setViewExam({ ...exam, answers: parsedAnswers });
                                                    }}
                                                    className="btn btn-secondary btn-sm tuner-btn-success"
                                                    title="Antworten ansehen"
                                                >
                                                    <Eye size={14} style={{ marginRight: '6px' }} /> Auswerten
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(exam.user_id, exam.username)}
                                                className="btn btn-danger btn-icon btn-sm"
                                                style={{ opacity: 0.6 }}
                                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                                onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                                                title="Datensatz löschen (Zurücksetzen)"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
