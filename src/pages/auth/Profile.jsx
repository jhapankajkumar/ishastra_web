import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../components/NotificationProvider';
import * as authApi from '../../api/authApi';
import config from '../../config/environment';
import styles from './AuthForm.module.css';

export default function Profile() {
  const { user, refreshMe } = useAuth();
  const notify = useNotification();
  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const avatarSrc = user.avatarUrl ? config.getImageUrl(user.avatarUrl) : null;

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify.error('Please upload an image file.');
      return;
    }
    setUploading(true);
    try {
      await authApi.uploadAvatar(file);
      await refreshMe();
      notify.success('Avatar updated.');
    } catch (err) {
      notify.error(err.response?.data?.error || 'Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Profile</h1>
        <p className={styles.subtitle}>Your account details.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            onClick={handleAvatarClick}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
              fontSize: 28,
              color: 'var(--text-muted)',
            }}
            title="Click to change avatar"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              '👤'
            )}
          </div>
          <div>
            <button type="button" className={styles.link} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={handleAvatarClick} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Change avatar'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.field}>
            <span className={styles.label}>Email</span>
            <div className={styles.input} style={{ background: 'var(--bg-primary)' }}>{user.email}</div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Role</span>
            <div className={styles.input} style={{ background: 'var(--bg-primary)' }}>
              {user.role === 'SUPERUSER' ? 'Superuser' : 'User'}
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Trading currency</span>
            <div className={styles.input} style={{ background: 'var(--bg-primary)' }}>
              {user.preferredCurrency || 'Not restricted'}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Link to="/profile/password" className={styles.link}>Update password</Link>
        </div>
      </div>
    </div>
  );
}
