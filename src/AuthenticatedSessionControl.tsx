import React, { PureComponent, ComponentType } from 'react';
import SessionControlModal, { SessionControlModalProps } from './SessionControlModal';
import { debounce, throttle } from './utils';
import '../SessionControl.css';

const LAST_ACITIVTY_TIME_STORAGE_KEY = 'sc-last-activity-time';
const LOGOUT_CAUSE_STORAGE_KEY = 'sc-logout-cause';

interface AuthenticatedSectionControlProps extends Omit<SessionControlModalProps, 'remainingTime' | 'isOpen' | 'progressPercent' | 'onLogoutClick' | 'onContinueClick'> {
  /**Inictivity timeout in seconds. */
  inactivityTimeout: number,
  /**Inictivity timeout when modal is open in seconds. */
  modalInactivityTimeout: number,
  /**Key do check existence in local storage. */
  storageTokenKey?: string,
  /**If should warn timeout in document title. */
  showDocumentTitleAlert?: boolean,
  /**The text displayed as document title case showDocumentTitleAlert is true. */
  documentTitleAlertText?: string,
  /**The time in miliseconds to debounce token changes.  */
  tokenChangeDebounceTime?: number,
  /**The time in miliseconds to throttle user activity. */
  userActivityThrottleTime?: number,
  /**Debug mode. */
  debug?: boolean,
  /**Callback to be called when timer ends, logout click or token is removed from local storage. */
  onLogout?: (logoutType: LogoutTypes, local?: boolean) => void | Promise<any>,
  /**Callback to be called when inactivy ends. */
  onInactivityTimeout?: () => void | Promise<any>,
  /**Callback to be called when modal inactivy ends. */
  onInactivityModalTimeout?: () => void | Promise<any>,
  /**Modal element to render. */
  renderModal?: ComponentType<SessionControlModalProps>
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

  _isMounted = true;
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

    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
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
    this.debug('MOUNTED');

    this.initAcitivityListeners();
    this.handleUserActivity(true);

    //Cleaning the last logout cause registered.
    localStorage.removeItem(LOGOUT_CAUSE_STORAGE_KEY);
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.removeActivityListeners();
    this.clearRefs();
    this.debug('UNMOUNTED');
  }

  debug(description: string) {
    const { debug } = this.props;
    if (debug) {
      console.log('REACT-SESSON-CONTROL-DEBUG: ', description);
    }
  }

  initAcitivityListeners() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    document.addEventListener('mousemove', this.throttledHandleUserActivity);
    document.addEventListener('keypress', this.throttledHandleUserActivity);
    window.addEventListener('storage', this.handleStorageChange);
  }

  removeActivityListeners() {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    document.removeEventListener('mousemove', this.throttledHandleUserActivity);
    document.removeEventListener('keypress', this.throttledHandleUserActivity);
    window.removeEventListener('storage', this.handleStorageChange);
  }

  clearRefs() {
    clearInterval(this.inactivityTimeoutRef);
    clearInterval(this.modalTimerIntervalRef);
  }

  resetDocumentTitle() {
    const { showDocumentTitleAlert } = this.props;

    if (showDocumentTitleAlert) {
      document.title = this.originalDocumentTitle;
    }
  }

  logout(logoutType: LogoutTypes, isFromOtherTab = false) {
    if (!this._isMounted) {
      return;
    }

    this.removeActivityListeners();
    this.clearRefs();

    this.debug(`LOGOUT TYPE: (${logoutType.toUpperCase()}) LOCAL: (${String(!isFromOtherTab)})`);

    if (!isFromOtherTab) {
      localStorage.setItem(LOGOUT_CAUSE_STORAGE_KEY, logoutType);
    }

    this.resetDocumentTitle();

    const { onLogout } = this.props;

    this.setState({ isModalOpen: false }, () => {
      if (onLogout) {
        onLogout(logoutType, !isFromOtherTab);
      }
    });
  }

  getProgressWidth() {
    const { modalInactivityTimeout } = this.props;
    const { modalTimer } = this.state;
    return `${modalTimer / modalInactivityTimeout * 100}%`;
  }

  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      const lastActivity = localStorage.getItem(LAST_ACITIVTY_TIME_STORAGE_KEY);

      const { inactivityTimeout, modalInactivityTimeout } = this.props;

      const maximumDowntime = (inactivityTimeout + modalInactivityTimeout) * 1000;

      const inactivityTime = (Date.now() - Number(lastActivity));

      this.debug(`INACTIVITY TIME: (${inactivityTime}) DOWNTIME: (${maximumDowntime})`)

      if (inactivityTime >= maximumDowntime) {
        this.logout(LogoutTypes.inactivity);
      } else {
        localStorage.setItem(LAST_ACITIVTY_TIME_STORAGE_KEY, Date.now().toString());
      }
    }
  }

  handleUserActivity(updateLastActivity: boolean = false) {
    const { isModalOpen } = this.state;
    const { inactivityTimeout, modalInactivityTimeout } = this.props;

    if (updateLastActivity) {
      localStorage.setItem(LAST_ACITIVTY_TIME_STORAGE_KEY, Date.now().toString());
    }

    this.clearRefs();

    this.debug('ACTIVITY');

    if (isModalOpen) {
      this.resetDocumentTitle();
      this.setState({
        modalTimer: modalInactivityTimeout
      }, () => {
        this.modalTimerIntervalRef = setInterval(this.handleModalTimer, 1000)
      });
    } else {
      this.inactivityTimeoutRef = setTimeout(this.handleInactivityTimeout, inactivityTimeout * 1000);
    }
  }

  handleInactivityTimeout() {
    const { inactivityTimeout, onInactivityTimeout } = this.props;
    const lastActivity = localStorage.getItem(LAST_ACITIVTY_TIME_STORAGE_KEY);

    if (!lastActivity || Date.now() >= (Number(lastActivity) + (inactivityTimeout * 1000))) {
      if (onInactivityTimeout) {
        onInactivityTimeout();
      }

      this.setState({ isModalOpen: true }, () => {
        this.handleUserActivity();
      })
    } else {
      this.handleUserActivity();
    }
  }

  handleModalTimer() {
    const { showDocumentTitleAlert, documentTitleAlertText, onInactivityModalTimeout } = this.props;
    const { modalTimer } = this.state;

    if (modalTimer === 0) {
      if (onInactivityModalTimeout) {
        onInactivityModalTimeout();
      }

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
    const { storageTokenKey } = this.props;

    //Checking if the token has been removed.
    if (storageTokenKey && event.key === storageTokenKey || event.key === null) {
      //Using debounce here to handle multiple changes.
      this.debouncedHandleStorageKeyChange(event);
    }

    //Checking if other tab register activity.
    if (event.key === LAST_ACITIVTY_TIME_STORAGE_KEY) {
      this.debug('OTHER TAB ACTIVITY -> CALLING LOCAL ACTIVITY');
      this.setState({ isModalOpen: false }, () => this.handleUserActivity())
    }
  }

  handleStorageKeyChange(event: any) {
    const { storageTokenKey } = this.props;
    const { newValue } = event;

    const currentTokenValue = localStorage.getItem(storageTokenKey);

    if (newValue == null && currentTokenValue == null) {
      this.debug(`LOST TOKEN - CURRENT VALUE: ${currentTokenValue}`)
      //Verifying if other table register logout cause.
      const logoutType = (localStorage.getItem(LOGOUT_CAUSE_STORAGE_KEY) || LogoutTypes.lostToken) as LogoutTypes;
      this.logout(logoutType, true);
    }
  }

  handleModalLogoutClick() {
    this.logout(LogoutTypes.button);
  }

  handleModalContinueClick() {
    clearInterval(this.modalTimerIntervalRef);
    this.resetDocumentTitle();
    this.setState({ isModalOpen: false }, () => {
      this.handleUserActivity();
    });
  }

  render() {
    const { title, message, timerMessage, logoutButtonText, continueButtonText, renderModal: Modal } = this.props;
    const { modalTimer, isModalOpen } = this.state;

    const ModalComponent = Modal || SessionControlModal;

    return (
      <ModalComponent
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
