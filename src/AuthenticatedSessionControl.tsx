import React, { PureComponent } from 'react';
import SessionControlModal from './SessionControlModal';
import { debounce, throttle } from './utils';
import '../SessionControl.css';

const LAST_ACITIVTY_TIME_STORAGE_KEY = 'sc-last-activity-time';

interface AuthenticatedSectionControlProps {
  /**Inictivity timeout in seconds. */
  inactivityTimeout: number,
  /**Inictivity timeout when modal is open in seconds. */
  modalInactivityTimeout: number,
  /**Callback to be called when timer ends, logout click or token is removed from local storage. */
  onLogout?: (logoutType: LogoutTypes) => void,
  /**Key do check existence in local storage. */
  storageTokenKey?: string,
  /**Title to display in modal header */
  title?: string,
  /**Message to display in modal. */
  message?: string,
  /**Message to display before time count in modal. */
  timerMessage?: string,
  /**Text to display in continue button. */
  continueButtonText?: string,
  /**Logout modal button text. */
  logoutButtonText?: string,
  /**If should display document title alert. */
  showDocumentTitleAlert?: boolean,
  /**The text displayed as document title case showDocumentTitleAlert is true. */
  documentTitleAlertText?: string,
  /**The time in miliseconds to debounce token changes.  */
  tokenChangeDebounceTime?: number,
  /**The time in miliseconds to throttle user activity. */
  userActivityThrottleTime?: number,
  /**Debug mode. */
  debug?: boolean,
}

export enum LogoutTypes {
  button = 'button',
  inactivity = 'inactivity',
  lostToken = 'lostToken'
}

interface State {
  isModalOpen: boolean,
  modalTimer?: number
}

export default class AuthenticatedSessionControl extends PureComponent<AuthenticatedSectionControlProps, State> {
  static defaultProps: Partial<AuthenticatedSectionControlProps> = {
    showDocumentTitleAlert: true,
    title: 'Inactivity alert',
    message: 'You have been inactive for a long time. Do you want to remain logged in?',
    continueButtonText: 'Continue',
    logoutButtonText: 'Logout',
    timerMessage: 'You will be disconnected in: ',
    documentTitleAlertText: 'INACTIVITY ALERT',
    tokenChangeDebounceTime: 500,
    userActivityThrottleTime: 500,
    debug: false
  };

  originalDocumentTitle: string = null;
  inactivityTimeoutRef: any = null;
  modalTimerIntervalRef: any = null;
  throttledHandleUserActivity: any;
  debouncedHandleStorageKeyChange: any;

  constructor(props: AuthenticatedSectionControlProps) {
    super(props);

    const { modalInactivityTimeout, userActivityThrottleTime, tokenChangeDebounceTime } = props;

    this.state = {
      isModalOpen: false,
      modalTimer: modalInactivityTimeout,
    }

    this.handleInactivityTimeout = this.handleInactivityTimeout.bind(this);
    this.handleModalTimer = this.handleModalTimer.bind(this);
    this.handleModalLogoutClick = this.handleModalLogoutClick.bind(this);
    this.handleModalContinueClick = this.handleModalContinueClick.bind(this);
    this.handleStorageChange = this.handleStorageChange.bind(this);
    this.handleStorageKeyChange = this.handleStorageKeyChange.bind(this);

    this.throttledHandleUserActivity = throttle(this.handleUserActivity.bind(this, true), userActivityThrottleTime);
    this.debouncedHandleStorageKeyChange = debounce(this.handleStorageKeyChange, tokenChangeDebounceTime);

    this.originalDocumentTitle = document.title;
  }

  componentDidMount() {
    this.initAcitivityListeners();
    this.handleUserActivity();
  }

  componentWillUnmount() {
    this.removeActivityListeners();
    this.clearRefs();
  }

  initAcitivityListeners() {
    document.addEventListener('mousemove', this.throttledHandleUserActivity);
    document.addEventListener('keypress', this.throttledHandleUserActivity);
    window.addEventListener('storage', this.handleStorageChange);
  }

  removeActivityListeners() {
    document.removeEventListener('mousemove', this.throttledHandleUserActivity);
    document.removeEventListener('keypress', this.throttledHandleUserActivity);
    window.removeEventListener('storage', this.handleStorageChange);

  }

  clearRefs() {
    clearInterval(this.inactivityTimeoutRef);
    clearInterval(this.modalTimerIntervalRef);
  }

  logout(logoutType: LogoutTypes) {
    this.removeActivityListeners();
    this.clearRefs();

    const { showDocumentTitleAlert, onLogout } = this.props;

    if (showDocumentTitleAlert) {
      document.title = this.originalDocumentTitle;
    }

    this.setState({ isModalOpen: false }, () => onLogout && onLogout(logoutType));
  }

  getProgressWidth() {
    const { modalInactivityTimeout } = this.props;
    const { modalTimer } = this.state;
    return `${modalTimer / modalInactivityTimeout * 100}%`;
  }

  handleUserActivity(updateLastActivity: boolean = false) {
    const { isModalOpen } = this.state;
    const { inactivityTimeout, modalInactivityTimeout } = this.props;

    if (updateLastActivity) {
      localStorage.setItem(LAST_ACITIVTY_TIME_STORAGE_KEY, Date.now().toString());
    }

    if (isModalOpen) {
      clearInterval(this.modalTimerIntervalRef);

      this.setState({
        modalTimer: modalInactivityTimeout
      }, () => {
        this.modalTimerIntervalRef = setInterval(this.handleModalTimer, 1000)
      });
    } else {
      clearTimeout(this.inactivityTimeoutRef);
      this.inactivityTimeoutRef = setTimeout(this.handleInactivityTimeout, inactivityTimeout * 1000);
    }
  }

  handleInactivityTimeout() {
    const { inactivityTimeout } = this.props;
    const lastActivity = localStorage.getItem(LAST_ACITIVTY_TIME_STORAGE_KEY);

    if (!lastActivity || Date.now() >= (Number(lastActivity) + (inactivityTimeout * 1000))) {
      this.setState({ isModalOpen: true }, () => {
        this.handleUserActivity();
      })
    } else {
      this.handleUserActivity();
    }
  }

  handleModalTimer() {
    const { showDocumentTitleAlert, documentTitleAlertText } = this.props;
    const { modalTimer } = this.state;

    if (modalTimer === 0) {
      this.logout(LogoutTypes.inactivity)
    } else {
      if (showDocumentTitleAlert) {
        if (document.title === this.originalDocumentTitle) {
          document.title = documentTitleAlertText;
        } else {
          document.title = this.originalDocumentTitle;
        }
      }
      this.setState({ modalTimer: modalTimer - 1 });
    }
  }

  handleStorageChange(event: any) {
    const { storageTokenKey, showDocumentTitleAlert } = this.props;

    if (event.key === LAST_ACITIVTY_TIME_STORAGE_KEY) {
      this.setState({ isModalOpen: false }, () => {
        clearInterval(this.modalTimerIntervalRef);

        if (showDocumentTitleAlert) {
          document.title = this.originalDocumentTitle;
        }

        this.handleUserActivity();
      })
    } else {
      this.handleUserActivity();
    }

    if (storageTokenKey && event.key === storageTokenKey || event.key === null) {
      //Using debounce here to handle multiple changes.
      this.debouncedHandleStorageKeyChange(event);
    }
  }

  handleStorageKeyChange(event: any) {
    const { debug } = this.props;
    const { newValue } = event;

    if (debug) console.log('REACT-SESSION-CONTROL|TOKEN-CHANGE-EVENT:', event);

    if (newValue == null) {
      this.logout(LogoutTypes.lostToken)
    }
  }

  handleModalLogoutClick() {
    this.logout(LogoutTypes.button);
  }

  handleModalContinueClick() {
    const { showDocumentTitleAlert } = this.props;

    clearInterval(this.modalTimerIntervalRef);

    if (showDocumentTitleAlert) {
      document.title = this.originalDocumentTitle;
    }

    this.setState({ isModalOpen: false }, () => {
      this.handleUserActivity();
    });
  }

  render() {
    const { title, message, timerMessage, logoutButtonText, continueButtonText } = this.props;
    const { modalTimer, isModalOpen } = this.state;

    return (
      <SessionControlModal
        isOpen={isModalOpen}
        title={title}
        message={message}
        timerMessage={timerMessage}
        logoutButtonText={logoutButtonText}
        continueButtonText={continueButtonText}
        remainingTime={modalTimer}
        progressPercent={this.getProgressWidth()}
        onContinueClick={this.handleModalContinueClick}
        onLogoutClick={this.handleModalLogoutClick}
      />
    )
  }
}
