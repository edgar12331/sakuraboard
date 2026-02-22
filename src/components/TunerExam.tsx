import { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, CheckCircle, Lock, AlertTriangle, Save } from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'https://sakura-bot-fkih.onrender.com/api';

// --- QUESTION DEFINITIONS ---
type QuestionType = 'radio' | 'checkbox';

interface Option {
    text: string;
}

interface Question {
    id: string;
    section: string;
    text: string;
    type: QuestionType;
    points: number;
    options: Option[];
    image?: string;
    correctAnswers?: string[];
}

export const EXAM_QUESTIONS: Question[] = [
    {
        id: 'q1',
        section: 'Grundkompetenz',
        text: 'Welche Pflichten hast du während des Dienstes?',
        type: 'checkbox',
        points: 3,
        options: [
            { text: 'Funkpflicht' },
            { text: 'Tägliche Anwesenheitspflicht in der Werkstatt' },
            { text: 'Anwesenheit im TeamSpeak' },
            { text: 'Außendienst / Durchführung von Reparaturen' },
            { text: 'Abmeldung aus dem Dienst beim Verlassen des Dienstes' },
            { text: 'Tragen einer Waffe während des Dienstes' },
        ],
        correctAnswers: ['Funkpflicht', 'Außendienst / Durchführung von Reparaturen', 'Abmeldung aus dem Dienst beim Verlassen des Dienstes']
    },
    {
        id: 'q2',
        section: 'Grundkompetenz',
        text: 'Wie viel kostet eine Reparatur in der Werkstatt?',
        type: 'radio',
        points: 2,
        options: [
            { text: '5.000$' }, { text: 'Gratis' }, { text: '2.500$' },
            { text: '2.000$' }, { text: '1.000$' }, { text: '1.500$' },
        ],
        correctAnswers: ['Gratis', '2.000$'] // Note user input says gratis + 2000
    },
    {
        id: 'q3',
        section: 'Grundkompetenz',
        text: 'Wie wird der Preis bei normalen Kunden berechnet?',
        type: 'radio',
        points: 1,
        options: [
            { text: 'x1' }, { text: 'x2' }, { text: 'x3' }, { text: 'x4' }, { text: 'x5' },
            { text: 'x6' }, { text: 'x7' }, { text: 'x8' }, { text: 'x9' }, { text: 'x10' },
        ],
    },
    {
        id: 'q4',
        section: 'Grundkompetenz',
        text: 'Wie hoch sind die Wochenabgaben?',
        type: 'radio',
        points: 1,
        options: [
            { text: '200.000$' }, { text: '175.000$' }, { text: '170.000$' }, { text: '150.000$' },
            { text: '130.000$' }, { text: '100.000$' }, { text: '50.000$' }, { text: '25.000$' },
            { text: 'Es gibt keine wöchentliche Abgabe.' }
        ],
        correctAnswers: ['150.000$']
    },
    {
        id: 'q5',
        section: 'Grundkompetenz',
        text: 'Wie solltest du reagieren, wenn du von einem Kunden beleidigt oder bedroht wirst?',
        type: 'checkbox',
        points: 3,
        options: [
            { text: 'Den Kunden mit einer Waffe bedrohen und fesseln' },
            { text: 'Das LSPD verständigen' },
            { text: 'Den Kunden ignorieren' },
            { text: 'Ein Hausverbot aussprechen' },
            { text: 'Den Kunden anschreien' },
            { text: 'Ein Mitglied der Führungs- oder Leitungsebene hinzuziehen' },
        ],
        correctAnswers: ['Das LSPD verständigen', 'Ein Hausverbot aussprechen', 'Ein Mitglied der Führungs- oder Leitungsebene hinzuziehen']
    },
    {
        id: 'q6',
        section: 'Grundkompetenz',
        text: 'Wie lange darfst du ein Hausverbot aussprechen?',
        type: 'radio',
        points: 1,
        options: [
            { text: 'Permanent' }, { text: 'Einen Tag.' }, { text: 'Eine Woche' },
            { text: 'Einen Monat' }, { text: 'Drei Monate' }, { text: 'Ein Jahr' },
        ],
    },
    {
        id: 'q7',
        section: 'Grundkompetenz',
        text: 'Was musst du tun, bevor du die Werkstatt verlässt?',
        type: 'checkbox',
        points: 3,
        options: [
            { text: 'Den Dienst verlassen' },
            { text: 'Die Dienstkleidung ausziehen' },
            { text: 'Alle Dienstfahrzeuge ausparken' },
            { text: 'Alle Fahrzeuge reparieren, die sich bei der Werkstatt befinden' },
            { text: 'Über Funk mitteilen, dass man den Dienst verlässt' },
        ],
        correctAnswers: ['Den Dienst verlassen', 'Die Dienstkleidung ausziehen', 'Über Funk mitteilen, dass man den Dienst verlässt']
    },
    {
        id: 'q8',
        section: 'Grundkompetenz',
        text: 'Ab wann musst du dich im DC abmelden?',
        type: 'radio',
        points: 2,
        options: [
            { text: 'Ab 1 Tag' }, { text: 'Ab 2 Tagen' }, { text: 'Ab 3 Tagen' },
            { text: 'Ab 4 Tagen' }, { text: 'Ab 5 Tagen' }, { text: 'Ab einer Woche' }
        ],
    },
    {
        id: 'q9',
        section: 'Grundkompetenz',
        text: 'Für Aufstellungen: Wer darf Fraktionsfarben eintragen?',
        type: 'checkbox',
        points: 2,
        options: [
            { text: 'Alle' }, { text: 'Tuner' }, { text: 'Meister' },
            { text: 'Führungsebene' }, { text: 'Leitungsebene' }
        ],
    },
    {
        id: 'q10',
        section: 'Grundkompetenz',
        text: 'Was musst du tun, wenn du AFK gehen musst?',
        type: 'checkbox',
        points: 2,
        options: [
            { text: 'Mich mit „Hände hoch“ in der Hocke an die Wand stellen' },
            { text: 'Emoten (z. B. Buch lesen, Putzen)' },
            { text: 'In einen leeren Raum gehen' },
            { text: 'In den Relog gehen' },
            { text: 'Einfach stehen bleiben' },
            { text: 'Ins Fahrzeug setzen' }
        ],
    },
    {
        id: 'q11',
        section: 'Grundkompetenz',
        text: 'Darfst du in der Werkstatt parken?',
        type: 'radio',
        points: 1,
        options: [
            { text: 'Ja' }, { text: 'Nein' }, { text: 'Nur mit Erlaubnis der Führungs- und/oder Leitungsebene' }
        ],
    },
    {
        id: 'q12',
        section: 'Grundkompetenz',
        text: 'Darfst du bei Nagata tunen?',
        type: 'radio',
        points: 1,
        image: '/prüfung/bild1.png',
        options: [
            { text: 'Ja' }, { text: 'Ja, aber nur mit Genehmigung der Nagata-Leitungsebene' }, { text: 'Nein' }
        ],
        correctAnswers: ['Ja, aber nur mit Genehmigung der Nagata-Leitungsebene']
    },
    {
        id: 'q13',
        section: 'Werkstatt',
        text: 'Welche Fahrzeuge dürfen im Parkhaus abgestellt werden?',
        type: 'checkbox',
        points: 1, // Assume 1 point for partial
        image: '/prüfung/bild2.png',
        options: [
            { text: 'Parkplatz für Dienstfahrzeuge' },
            { text: 'Kundenparkplatz' },
            { text: 'Parkplatz für den Abschlepper' },
            { text: 'Mitarbeiterparkplatz' },
            { text: 'Ort für abgeschleppte Fahrzeuge' },
            { text: 'Dieser Ort ist für nichts Bestimmtes vorgesehen' },
            { text: 'Parkverbot / Halteverbot' }
        ],
        correctAnswers: ['Parkplatz für Dienstfahrzeuge', 'Kundenparkplatz', 'Mitarbeiterparkplatz']
    },
    {
        id: 'q14',
        section: 'Werkstatt',
        text: 'Welche Fahrzeuge dürfen hier abgestellt werden?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild3.png',
        options: [
            { text: 'Dienstparkplatz (ausschließlich Dienstfahrzeuge)' },
            { text: 'Dienstparkplatz (Dienstfahrzeuge und Fahrzeuge der Leitungsebene)' },
            { text: 'Kundenparkplatz' },
            { text: 'Parkplatz für den Abschlepper' },
            { text: 'Mitarbeiterparkplatz' },
            { text: 'Ort für abgeschleppte Fahrzeuge' },
            { text: 'Dieser Ort ist für nichts Bestimmtes vorgesehen' },
            { text: 'Parkverbot / Halteverbot' }
        ],
        correctAnswers: ['Parkverbot / Halteverbot']
    },
    {
        id: 'q15',
        section: 'Werkstatt',
        text: 'Welche Fahrzeuge dürfen hier abgestellt werden?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild4.png',
        options: [
            { text: 'Dienstparkplatz (ausschließlich Dienstfahrzeuge)' },
            { text: 'Dienstparkplatz (Dienstfahrzeuge und Fahrzeuge der Leitungsebene)' },
            { text: 'Kundenparkplatz' },
            { text: 'Parkplatz für den Abschlepper' },
            { text: 'Mitarbeiterparkplatz' },
            { text: 'Ort für abgeschleppte Fahrzeuge' },
            { text: 'Dieser Ort ist für nichts Bestimmtes vorgesehen' },
            { text: 'Parkverbot / Halteverbot' }
        ],
        correctAnswers: ['Parkplatz für den Abschlepper']
    },
    {
        id: 'q16',
        section: 'Werkstatt',
        text: 'Welche Fahrzeuge dürfen hier abgestellt werden?',
        type: 'checkbox',
        points: 2,
        image: '/prüfung/bild5.png',
        options: [
            { text: 'Dienstparkplatz (ausschließlich Dienstfahrzeuge)' },
            { text: 'Dienstparkplatz (Dienstfahrzeuge und Fahrzeuge der Leitungsebene)' },
            { text: 'Kundenparkplatz' },
            { text: 'Parkplatz für den Abschlepper' },
            { text: 'Mitarbeiterparkplatz' },
            { text: 'Ort für abgeschleppte Fahrzeuge' },
            { text: 'Dieser Ort ist für nichts Bestimmtes vorgesehen' },
            { text: 'Parkverbot / Halteverbot' },
            { text: 'Hier dürfen ausschließlich der Jester, der GTR und der NSX abgestellt werden' }
        ],
        correctAnswers: ['Dienstparkplatz (ausschließlich Dienstfahrzeuge)', 'Dienstparkplatz (Dienstfahrzeuge und Fahrzeuge der Leitungsebene)']
    },
    {
        id: 'q17',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild6.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
    },
    {
        id: 'q18',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild7.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
        correctAnswers: ['LKWs, Sattelschlepper und Busse']
    },
    {
        id: 'q19',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild8.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
        correctAnswers: ['Helikopter']
    },
    {
        id: 'q20',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild9.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
        correctAnswers: ['Flugzeuge']
    },
    {
        id: 'q21',
        section: 'Einsatzorte',
        text: 'Welche Fahrzeuge werden hier getuned?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild10.png',
        options: [
            { text: 'Autos, Motorräder und Fahrräder' },
            { text: 'LKWs, Sattelschlepper und Busse' },
            { text: 'Helikopter' },
            { text: 'Flugzeuge' },
            { text: 'Boote, Uboote und Jetskis' },
            { text: 'Alles' }
        ],
        correctAnswers: ['Boote, Uboote und Jetskis']
    },
    {
        id: 'q22',
        section: 'Kleidungsvorschriften',
        text: 'Wann darfst du Schwarz tragen?',
        type: 'checkbox',
        points: 2,
        image: '/prüfung/bild11.png',
        options: [
            { text: 'Als Zivilist' }, { text: 'Als Mitarbeiter' },
            { text: 'Als Führungsebene' }, { text: 'Als Leitungsebene' }
        ],
        correctAnswers: [] // "Wann darfst du Schwarz tragen?" No clear correct answer in dump, assuming blank.
    },
    {
        id: 'q23',
        section: 'Kleidungsvorschriften',
        text: 'Wann darfst du Weiß tragen?',
        type: 'checkbox', // User form logic isn't fully clear here, checkbox allows multiple which is safer
        points: 1,
        image: '/prüfung/bild12.png',
        options: [
            { text: 'Als Zivilist' }, { text: 'Als Mitarbeiter' },
            { text: 'Als Führungsebene' }, { text: 'Als Leitungsebene' }
        ],
        correctAnswers: ['Als Mitarbeiter']
    },
    {
        id: 'q24',
        section: 'Kleidungsvorschriften',
        text: 'Wann musst du keine Dienstkleidung tragen?',
        type: 'checkbox',
        points: 1,
        image: '/prüfung/bild13.png',
        options: [
            { text: 'Im Dienst' }, { text: 'Im Außendienst' }, { text: 'Als Zivilist' },
            { text: 'Als Mitarbeiter' }, { text: 'Als Führungsebene' }, { text: 'Als Leitungsebene' }
        ],
        correctAnswers: ['Als Zivilist']
    }
];

interface TunerExamProps {
    logout: () => void;
}

export function TunerExam({ logout }: TunerExamProps) {
    const [status, setStatus] = useState<'loading' | 'locked' | 'unlocked' | 'submitted'>('loading');
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [ausbilderName, setAusbilderName] = useState('');
    const [charName, setCharName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await axios.get(`${API_URL}/tuner-exam/status`);
                setStatus(res.data.status);
            } catch (err) {
                console.error('Failed to fetch tuner exam status', err);
                setErrorMsg('Fehler beim Laden des Prüfungsstatus.');
                setStatus('locked');
            }
        };

        fetchStatus();

        // If locked, poll every 10 seconds to see if unlocked
        let interval: any;
        if (status === 'locked') {
            interval = setInterval(fetchStatus, 10000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [status]);

    const handleAnswerChange = (qId: string, value: string, type: QuestionType, checked: boolean) => {
        setAnswers(prev => {
            const current = prev[qId] || [];
            if (type === 'radio') {
                return { ...prev, [qId]: [value] };
            } else {
                if (checked) {
                    return { ...prev, [qId]: [...current, value] };
                } else {
                    return { ...prev, [qId]: current.filter(v => v !== value) };
                }
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!ausbilderName.trim() || !charName.trim()) {
            setErrorMsg('Bitte fülle deinen Namen und den des Ausbilders aus.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            await axios.post(`${API_URL}/tuner-exam/submit`, {
                answers,
                ausbilder: ausbilderName,
                score: 0 // Will be calculated by admin manually, or you can implement an auto-grader here
            });
            setStatus('submitted');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Submit error:', err);
            setErrorMsg('Fehler beim Einreichen. Bitte versuche es erneut.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="login-screen">
                <div className="login-box bg-transparent border-0 shadow-none text-center">
                    <div className="sakura-spin text-sakura-400 mb-4 h-12 w-12 border-t-transparent rounded-full mx-auto" style={{ borderTopColor: 'transparent', borderRadius: '50%', width: 48, height: 48, border: '4px solid var(--sakura-400)' }}></div>
                    <p>Status wird geladen...</p>
                </div>
            </div>
        );
    }

    if (status === 'locked') {
        return (
            <div className="login-screen">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="login-box"
                    style={{ textAlign: 'center' }}
                >
                    <div className="admin-icon" style={{ margin: '0 auto 24px' }}>
                        <Lock size={32} />
                    </div>
                    <h1 className="login-title" style={{ fontSize: '24px' }}>Prüfung gesperrt</h1>
                    <p className="login-subtitle" style={{ marginBottom: '32px' }}>
                        Deine Zugriffsanfrage wurde registriert. Bitte warte, bis ein Ausbilder oder Administrator deine Prüfung freischaltet.
                        <br /><br />
                        Diese Seite aktualisiert sich automatisch, sobald du freigeschaltet wurdest.
                    </p>
                    <button className="btn btn-secondary w-full justify-center" onClick={logout}>
                        <LogOut size={16} className="mr-2" /> Abmelden
                    </button>
                </motion.div>
            </div>
        );
    }

    if (status === 'submitted') {
        return (
            <div className="login-screen">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="login-box"
                    style={{ textAlign: 'center', borderColor: 'rgba(46, 213, 115, 0.3)' }}
                >
                    <div className="admin-icon" style={{ margin: '0 auto 24px', background: 'rgba(46, 213, 115, 0.15)', color: '#2ed573' }}>
                        <CheckCircle size={32} />
                    </div>
                    <h1 className="login-title" style={{ fontSize: '24px', color: '#2ed573' }}>Prüfung abgegeben!</h1>
                    <p className="login-subtitle" style={{ marginBottom: '32px' }}>
                        Herzlichen Glückwunsch, du hast die Tunerprüfung erfolgreich eingereicht!
                        Deine Antworten werden nun von den Ausbildern überprüft.
                    </p>
                    <button className="btn btn-secondary w-full justify-center" onClick={logout}>
                        <LogOut size={16} className="mr-2" /> Abmelden
                    </button>
                </motion.div>
            </div>
        );
    }

    // --- UNLOCKED: RENDER EXAM FORM ---
    // Group questions by section
    const sections = Array.from(new Set(EXAM_QUESTIONS.map(q => q.section)));

    return (
        <div className="exam-container">
            <div className="exam-header-card">
                <h1 className="exam-title">Tunerprüfung</h1>
                <p className="exam-intro">
                    Herzlich willkommen und herzlichen Glückwunsch, dass Sie es bis hierhin geschafft haben.
                    <br /><br />
                    Dieser Test dient der Überprüfung deiner allgemeinen Kompetenzen und soll dem Ausbilder eine fundierte Einschätzung ermöglichen, ob du für die Tätigkeit als Tuner geeignet bist.
                    <br /><br />
                    Um den Test erfolgreich zu bestehen, müssen mindestens <strong style={{ color: 'var(--sakura-400)' }}>34 von 38 Punkten</strong> erreicht werden.
                </p>

                {errorMsg && (
                    <div style={{ background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', color: '#ff4757', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                        <AlertTriangle size={18} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <div className="exam-user-info">
                    <div className="form-group">
                        <label className="form-label">Ihr Name (IC) <span style={{ color: '#ff4757' }}>*</span></label>
                        <input
                            type="text"
                            value={charName}
                            onChange={e => setCharName(e.target.value)}
                            className="input"
                            placeholder="Geben Sie Ihren Namen ein"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Name des Ausbilders (IC) <span style={{ color: '#ff4757' }}>*</span></label>
                        <input
                            type="text"
                            value={ausbilderName}
                            onChange={e => setAusbilderName(e.target.value)}
                            className="input"
                            placeholder="Name des Prüfers"
                            required
                        />
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {sections.map((section, sIdx) => (
                    <div key={section} className="exam-section">
                        <div className="exam-section-title">
                            <span className="exam-section-number">{sIdx + 1}</span>
                            {section}
                        </div>

                        {section === 'Grundkompetenz' && (
                            <div className="exam-note">
                                <strong>Wichtig:</strong> Bei einigen Fragen können mehrere Antwortmöglichkeiten korrekt sein.
                            </div>
                        )}

                        <div>
                            {EXAM_QUESTIONS.filter(q => q.section === section).map((q) => (
                                <motion.div
                                    key={q.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    className="exam-question-card"
                                >
                                    <div className="exam-question-header">
                                        <h3 className="exam-question-text">
                                            {q.text} <span style={{ color: '#ff4757' }}>*</span>
                                        </h3>
                                        <span className="exam-question-points">
                                            {q.points} {q.points === 1 ? 'Punkt' : 'Punkte'}
                                        </span>
                                    </div>

                                    {q.image && (
                                        <img src={q.image} alt="Fragenbild" className="exam-question-image" />
                                    )}

                                    <div className="exam-options-grid">
                                        {q.options.map((opt, oIdx) => {
                                            const isRadio = q.type === 'radio';
                                            const isChecked = (answers[q.id] || []).includes(opt.text);

                                            return (
                                                <label
                                                    key={oIdx}
                                                    className={`exam-option-label ${isChecked ? 'selected' : ''}`}
                                                >
                                                    <input
                                                        type={isRadio ? "radio" : "checkbox"}
                                                        name={q.id}
                                                        checked={isChecked}
                                                        onChange={(e) => handleAnswerChange(q.id, opt.text, q.type, e.target.checked)}
                                                        className={`exam-radio-check ${isRadio ? 'is-radio' : ''}`}
                                                    />
                                                    <div className="exam-option-text">
                                                        {opt.text}
                                                    </div>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="exam-footer">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={logout}
                    >
                        Abbrechen & Abmelden
                    </button>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                                Einreichen...
                            </>
                        ) : (
                            <>
                                <Save size={18} className="mr-2" />
                                Prüfung Abgeben
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
