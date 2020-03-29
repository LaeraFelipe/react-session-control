import React from 'react';
import '../SessionControlModal.css'

interface SessionControlModalProps {
  isOpen?: boolean,
  title?: string,
  message?: string,
  timerMessage?: string
  logoutButtonText?: string,
  continueButtonText?: string
  progressPercent?: string,
  remainingTime?: number,
  onLogoutClick?: () => void,
  onContinueClick?: () => void
}

export default function SessionControlModal({ isOpen = false, progressPercent = '100%', remainingTime = 0, title, message, timerMessage, logoutButtonText, continueButtonText, onLogoutClick, onContinueClick }: SessionControlModalProps) {
  return (
    <div className={`sc-modal-container ${isOpen ? 'sc-modal-container--open' : ''}`}>
      <div className={`sc-modal ${isOpen ? 'sc-modal--open' : ''}`}>
        <div className="sc-modal__header">
          <h4 className="sc-modal__title">
            {title}
          </h4>
        </div>
        <div className="sc-modal__body">
          <div className="sc-modal__message">
            {message}
          </div>
          <div className="sc-modal__progress">
            <div className="sc-modal__progress-bar" style={{ width: progressPercent }} />
          </div>
          <div className="sc-modal__timer-message">
            {timerMessage}{remainingTime}s
          </div>
        </div>
        <div className="sc-modal__footer">
          <button className="sc-modal__button sc-modal__button--logout" onClick={onLogoutClick}>
            {logoutButtonText}
          </button>
          <button className="sc-modal__button sc-modal__button--continue" onClick={onContinueClick}>
            {continueButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}
