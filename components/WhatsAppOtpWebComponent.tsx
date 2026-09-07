import React, { useState, useEffect, useRef } from 'react';

/**
 * Standalone React / Next.js WhatsApp Reverse OTP Component
 * 100% Free - Inbound verification without Meta Cloud API outbound auth template fees
 */
export default function WhatsAppOtpWebComponent({
  apiBaseUrl = 'http://localhost:5000',
  defaultPhone = '',
  onVerified = (data) => console.log('Verified:', data),
}) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(300);
  const [status, setStatus] = useState('IDLE'); // IDLE, WAITING, VERIFIED, EXPIRED, ERROR
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const pollingRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (status !== 'WAITING') return;
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Status Polling (every 2s)
  useEffect(() => {
    if (status !== 'WAITING' || !session?.sessionId) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/auth/whatsapp/status/${encodeURIComponent(session.sessionId)}`);
        const data = await res.json();
        if (data && data.verified) {
          setStatus('VERIFIED');
          clearInterval(pollingRef.current);
          onVerified(data);
        } else if (data && data.status === 'EXPIRED') {
          setStatus('EXPIRED');
          clearInterval(pollingRef.current);
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [status, session, apiBaseUrl, onVerified]);

  // Initiate Inbound WhatsApp verification
  const handleInitiate = async (e) => {
    e?.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/whatsapp/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.success && data.sessionId) {
        setSession(data);
        setTimer(data.expiresInSeconds || 300);
        setStatus('WAITING');
      } else {
        alert(data.message || 'Failed to start verification.');
      }
    } catch (err) {
      setLoading(false);
      alert('Network error connecting to backend.');
    }
  };

  // Manual fallback verify
  const handleManualVerify = async () => {
    if (!session?.sessionId || manualCode.trim().length !== 6) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/auth/whatsapp/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.sessionId, code: manualCode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('VERIFIED');
        if (pollingRef.current) clearInterval(pollingRef.current);
        onVerified({ sessionId: session.sessionId, phone: phoneNumber, ...data });
      } else {
        alert(data.message || 'Invalid code.');
      }
    } catch (e) {
      alert('Verification request failed.');
    }
  };

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.badge}>100% Free Inbound Verification</span>
        <h2 style={styles.title}>WhatsApp Quick Verification</h2>
      </div>

      {status === 'IDLE' && (
        <form onSubmit={handleInitiate} style={styles.form}>
          <label style={styles.label}>Mobile Phone Number</label>
          <div style={styles.inputGroup}>
            <span style={styles.prefix}>+91</span>
            <input
              type="tel"
              placeholder="10-digit number"
              maxLength={10}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              style={styles.input}
              required
            />
          </div>
          <button type="submit" disabled={loading} style={styles.primaryBtn}>
            {loading ? 'Generating Link...' : 'Continue with WhatsApp'}
          </button>
        </form>
      )}

      {status === 'WAITING' && session && (
        <div style={styles.waitingBox}>
          <div style={styles.codeSnippet}>
            <span style={styles.codeLabel}>Pre-filled verification text:</span>
            <div style={styles.codeVal}>VERIFY {session.verificationCode}</div>
            <span style={styles.codeSub}>to +{session.businessPhone}</span>
          </div>

          <a
            href={session.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.whatsappBtn}
          >
            <span>💬</span> Open WhatsApp & Send Message
          </a>

          <div style={styles.timerRow}>
            <span style={styles.spinner}>⏳</span>
            <span>
              Waiting for message... <strong>({formatTimer(timer)})</strong>
            </span>
          </div>

          <div style={styles.manualBox}>
            <button
              type="button"
              onClick={() => setShowManual(!showManual)}
              style={styles.toggleBtn}
            >
              {showManual ? 'Hide manual code' : 'Or type 6-digit code manually'}
            </button>

            {showManual && (
              <div style={styles.manualRow}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
                  style={styles.manualInput}
                />
                <button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={manualCode.length !== 6}
                  style={styles.manualBtn}
                >
                  Verify
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'VERIFIED' && (
        <div style={styles.verifiedBox}>
          <div style={{ fontSize: '48px' }}>🎉</div>
          <h3 style={{ color: '#25D366', margin: '8px 0' }}>Verified Successfully!</h3>
          <p style={{ color: '#999', fontSize: '14px' }}>
            Mobile number +91 {phoneNumber} is confirmed.
          </p>
        </div>
      )}

      {status === 'EXPIRED' && (
        <div style={styles.expiredBox}>
          <p style={{ color: '#ff6b6b' }}>Verification session expired.</p>
          <button type="button" onClick={() => setStatus('IDLE')} style={styles.primaryBtn}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    maxWidth: '420px',
    margin: '20px auto',
    padding: '24px',
    backgroundColor: '#12141a',
    borderRadius: '16px',
    color: '#fff',
    fontFamily: 'Inter, system-ui, sans-serif',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    border: '1px solid #232733',
  },
  header: { textAlign: 'center', marginBottom: '20px' },
  badge: {
    fontSize: '11px',
    color: '#25D366',
    backgroundColor: 'rgba(37,211,102,0.1)',
    padding: '4px 10px',
    borderRadius: '20px',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: { fontSize: '20px', fontWeight: '800', marginTop: '10px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  label: { fontSize: '13px', color: '#888', fontWeight: '600' },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#1c1f26',
    border: '1px solid #333',
    borderRadius: '10px',
    padding: '0 12px',
  },
  prefix: { color: '#25D366', fontWeight: '700', marginRight: '8px' },
  input: {
    flex: 1,
    height: '46px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
  },
  primaryBtn: {
    height: '48px',
    backgroundColor: '#25D366',
    color: '#000',
    fontWeight: '800',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '15px',
  },
  waitingBox: { display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' },
  codeSnippet: {
    backgroundColor: '#1a1d24',
    padding: '12px',
    borderRadius: '10px',
    border: '1px dashed #333',
  },
  codeLabel: { fontSize: '12px', color: '#777', display: 'block' },
  codeVal: { fontSize: '22px', fontWeight: '900', color: '#25D366', letterSpacing: '2px', margin: '4px 0' },
  codeSub: { fontSize: '11px', color: '#666' },
  whatsappBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    height: '48px',
    backgroundColor: '#25D366',
    color: '#fff',
    fontWeight: '800',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '15px',
  },
  timerRow: { fontSize: '13px', color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  manualBox: { borderTop: '1px solid #232733', paddingTop: '12px', marginTop: '6px' },
  toggleBtn: { background: 'none', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer' },
  manualRow: { display: 'flex', gap: '8px', marginTop: '10px' },
  manualInput: {
    flex: 1,
    height: '40px',
    backgroundColor: '#1a1d24',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: '2px',
    fontSize: '16px',
  },
  manualBtn: {
    padding: '0 16px',
    backgroundColor: '#25D366',
    border: 'none',
    borderRadius: '8px',
    color: '#000',
    fontWeight: '700',
    cursor: 'pointer',
  },
  verifiedBox: { textAlign: 'center', padding: '20px 0' },
  expiredBox: { textAlign: 'center', padding: '20px 0' },
};
