import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import logoUrl from './assets/logo.svg'
import { Settings } from './components/Settings'
import { useTranslation } from './i18n'
import { useStore } from './store/appStore'
import { edge } from './lib/edge'

function BackupMockupView() {
  const { t } = useTranslation()
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'radial-gradient(ellipse at 50% 30%, rgba(16, 185, 129, 0.18) 0%, rgba(6, 182, 212, 0.08) 50%, rgba(18, 18, 20, 0.95) 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box',
      position: 'relative'
    }}>
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          width: '380px',
          background: 'rgba(24, 24, 28, 0.94)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '16px',
          padding: '18px 20px',
          boxShadow: '0 16px 36px rgba(0,0,0,0.5), 0 0 24px rgba(16, 185, 129, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            display: 'grid',
            placeItems: 'center',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
            flexShrink: 0
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>backup_tdrop.txa</span>
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 600 }}>
                ENCRYPTED
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
              156 {t('backup.itemsUnit') || 'items'} · {t('backup.title') || 'Backup & Restore'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <div style={{ fontSize: '11.5px', fontWeight: 650, color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>🔄</span> {t('backup.modeMerge') || 'Merge (Recommended)'}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {t('backup.modeMergeDesc') || 'Keep current items and add non-duplicate items from the backup.'}
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <div style={{ fontSize: '11.5px', fontWeight: 650, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⚡</span> {t('backup.modeOverwrite') || 'Overwrite All'}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {t('backup.modeOverwriteDesc') || 'Completely replace current history and settings with the backup.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <div style={{
            flex: 1,
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#000',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '0 4px'
          }}>
            {t('backup.exportBtn') || 'Export Backup (.txa)'}
          </div>
          <div style={{
            flex: 1,
            height: '28px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '0 4px'
          }}>
            {t('backup.importBtn') || 'Restore Backup (.txa)'}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function Onboarding() {
  const { t } = useTranslation()
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    void useStore.getState().hydrate()
    const offSettings = edge.onSettings((next) => {
      useStore.getState().setSettings(next)
    })
    return () => {
      offSettings()
    }
  }, [])

  const slides = [
    {
      id: 'slide-1',
      title: t('onboarding.welcomeTitle'),
      description: t('onboarding.welcomeDesc'),
      videoSrc: 'welcome.webm',
      placeholderColor: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)'
    },
    {
      id: 'slide-2',
      title: t('onboarding.collectTitle'),
      description: t('onboarding.collectDesc'),
      videoSrc: 'copy.webm',
      placeholderColor: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)'
    },
    {
      id: 'slide-3',
      title: t('onboarding.dragTitle'),
      description: t('onboarding.dragDesc'),
      videoSrc: 'drag.webm',
      placeholderColor: 'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)'
    },
    {
      id: 'slide-4',
      title: t('onboarding.stacksTitle'),
      description: t('onboarding.stacksDesc'),
      videoSrc: 'stack.webm',
      placeholderColor: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)'
    },
    {
      id: 'slide-5-ungroup',
      title: t('onboarding.ungroupTitle'),
      description: t('onboarding.ungroupDesc'),
      videoSrc: 'ungroup.webm',
      placeholderColor: 'linear-gradient(135deg, #FAD961 0%, #F76B1C 100%)'
    },
    {
      id: 'slide-5',
      title: t('onboarding.mergeTitle'),
      description: t('onboarding.mergeDesc'),
      videoSrc: 'merge.webm',
      placeholderColor: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
    },
    {
      id: 'slide-preview',
      title: t('onboarding.previewTitle'),
      description: t('onboarding.previewDesc'),
      videoSrc: 'preview.webm',
      placeholderColor: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)'
    },
    {
      id: 'slide-backup',
      title: t('onboarding.backupTitle') || 'Backup & Restore Archive (.txa)',
      description: t('onboarding.backupDesc') || 'Export your clipboard history, pinned items, and settings into an encrypted .txa archive. Seamlessly transfer to a new PC or restore anytime with Merge or Overwrite modes.',
      videoSrc: '',
      placeholderColor: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)'
    },
    {
      id: 'slide-6',
      title: t('onboarding.configTitle'),
      description: t('onboarding.configDesc'),
      videoSrc: '',
      placeholderColor: 'transparent'
    }
  ]

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      await useStore.getState().patchSettings({ tutorialCompleted: true })
      window.close()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSkip = async () => {
    await useStore.getState().patchSettings({ tutorialCompleted: true })
    window.close()
  }

  const currentSlide = slides[currentIndex]

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#121212',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      fontFamily: 'Plus Jakarta Sans, Segoe UI, sans-serif'
    }}>
      {/* Header Bar */}
      <div style={{
        height: '64px',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #262626'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logoUrl} alt="T-Drop Logo" style={{ width: '28px', height: '28px' }} />
          <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.02em' }}>T-Drop</span>
        </div>
        <button
          onClick={handleSkip}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '6px',
            transition: 'color 0.2s, background 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#222' }}
          onMouseOut={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.background = 'transparent' }}
        >
          {t('onboarding.skip')}
        </button>
      </div>

      {/* Main Content Area */}
      {currentSlide.id === 'slide-6' ? (() => {
        const isTopEdge = useStore.getState().settings.stickPosition === 'top'
        return (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: isTopEdge ? 'column' : 'row',
            gap: isTopEdge ? '14px' : '32px',
            padding: isTopEdge ? '16px 28px' : '24px 32px',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}>
            {isTopEdge ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexShrink: 0 }}>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: '22px', margin: '0 0 6px 0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {currentSlide.title}
                  </h1>
                  <p style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                    {currentSlide.description}
                  </p>
                </div>
                <div style={{
                  background: '#1a1a1c',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  flex: '0 0 auto',
                  maxWidth: '440px'
                }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#fff', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('onboarding.proTips')}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                    {t('onboarding.proTip1')} · {t('onboarding.proTip2')}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h1 style={{ fontSize: '28px', margin: '0 0 12px 0', fontWeight: 700, letterSpacing: '-0.02em' }}>
                  {currentSlide.title}
                </h1>
                <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', margin: '0 0 24px 0' }}>
                  {currentSlide.description}
                </p>
                <div style={{ background: '#1a1a1c', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('onboarding.proTips')}
                  </div>
                  <ul style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                    <li>{t('onboarding.proTip1')}</li>
                    <li>{t('onboarding.proTip2')}</li>
                    <li>{t('onboarding.proTip3')}</li>
                    <li>{t('onboarding.proTip4')}</li>
                  </ul>
                </div>
              </div>
            )}

            <div style={{
              flex: 1,
              width: '100%',
              background: '#1a1a1c',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              minHeight: 0
            }}>
              <div style={{
                flex: 1,
                width: '100%',
                overflowY: isTopEdge ? 'hidden' : 'auto',
                overflowX: isTopEdge ? 'auto' : 'hidden',
                padding: isTopEdge ? '10px 14px' : '16px'
              }}>
                <Settings inlineIndicatorStyle={true} />
              </div>
            </div>
          </div>
        )
      })() : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 48px' }}>
          <div style={{
            width: '100%',
            maxWidth: '560px',
            height: '315px',
            background: '#1a1a1c',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
            marginBottom: '36px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: currentSlide.placeholderColor }}
              >
                {currentSlide.id === 'slide-backup' ? (
                  <BackupMockupView />
                ) : (
                  <video
                    key={currentSlide.videoSrc}
                    src={`${currentSlide.videoSrc}?v=1`}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div style={{ textAlign: 'center', height: '100px', maxWidth: '480px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <h1 style={{ fontSize: '24px', margin: '0 0 12px 0', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  {currentSlide.title}
                </h1>
                <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                  {currentSlide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Footer / Navigation Bar */}
      <div style={{
        height: '80px',
        padding: '0 40px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        borderTop: '1px solid #262626'
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            style={{
              background: '#2a2a2a',
              border: '1px solid #444',
              color: currentIndex === 0 ? '#555' : '#fff',
              fontSize: '15px',
              fontWeight: 500,
              cursor: currentIndex === 0 ? 'default' : 'pointer',
              padding: '8px 20px',
              borderRadius: '6px',
              transition: 'background 0.2s',
              opacity: currentIndex === 0 ? 0 : 1,
              pointerEvents: currentIndex === 0 ? 'none' : 'auto'
            }}
            onMouseOver={(e) => { if (currentIndex !== 0) e.currentTarget.style.background = '#333' }}
            onMouseOut={(e) => { if (currentIndex !== 0) e.currentTarget.style.background = '#2a2a2a' }}
          >
            {t('onboarding.back')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {slides.map((_, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: i === currentIndex ? '#fff' : '#444',
                transition: 'background 0.3s'
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleNext}
            style={{
              background: '#fff',
              border: 'none',
              color: '#000',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '8px 24px',
              borderRadius: '6px',
              transition: 'transform 0.1s, opacity 0.2s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            {currentIndex === slides.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
