import React, { PureComponent } from 'react';
import { debounce, throttle } from './utils';
import '../SessionControl.css';

interface SectionControlProps {
  /**Inictivity timeout in seconds. */
  inactivityTimeout: number,
  /**Inictivity timeout when modal is open in seconds. */
  modalInactivityTimeout: number,
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
  /**Key do check existence in local storage. */
  storageTokenKey?: string,
  /**Callback to be called when timer ends or logout click. */
  onLogout: (logoutType: LogoutTypes) => void,
}

interface State {
  isModalOpen: boolean,
  modalTotalTimer: number
  modalTimer?: number
}

export enum LogoutTypes {
  button = 'button',
  inactivity = 'inactivity',
  lostToken = 'lostToken'
}

export default class SessionControl extends PureComponent<SectionControlProps, State> {
  static defaultProps: SectionControlProps = {
    alertDocumentTitle: true,
    title: 'Inactivity alert',
    message: 'You have been inactive for a long time. Do you want to remain logged in?',
    continueButtonText: 'Continue',
    logoutButtonText: 'Logout',
    timerMessage: 'You will be disconnected in: ',
    showDocumentTitleAlert: true,
    documentTitleAlertText: 'INACTIVITY ALERT',
  } as any;

  originalDocumentTitle: string = null;
  inactivityTimeoutRef: any = null;
  modalTimerIntervalRef: any = null;
  modalElement: JQuery<HTMLElement> = null;

  throttledHandleUserActivity: any;
  debouncedHandleStorageKeyChange: any;

  constructor(props: SectionControlProps) {
    super(props);

    const { modalInactivityTimeout } = props;

    this.state = {
      isModalOpen: false,
      modalTotalTimer: modalInactivityTimeout,
      modalTimer: modalInactivityTimeout,
    }

    this.handleUserActivity = this.handleUserActivity.bind(this);
    this.handleInactivityTimeout = this.handleInactivityTimeout.bind(this);
    this.handleModalTimer = this.handleModalTimer.bind(this);
    this.handleModalLogoutClick = this.handleModalLogoutClick.bind(this);
    this.handleModalContinueClick = this.handleModalContinueClick.bind(this);
    this.handleStorageChange = this.handleStorageChange.bind(this);
    this.handleStorageKeyChange = this.handleStorageKeyChange.bind(this);

    this.throttledHandleUserActivity = throttle(this.handleUserActivity, 500);
    this.debouncedHandleStorageKeyChange = debounce(this.handleStorageKeyChange, 500);

    this.originalDocumentTitle = document.title;
  }

  componentDidMount() {
    const { storageTokenKey } = this.props;

    if (storageTokenKey) {
      window.addEventListener('storage', this.handleStorageChange);
    }

    document.addEventListener('mousemove', this.throttledHandleUserActivity);
    document.addEventListener('keypress', this.throttledHandleUserActivity);
    this.modalElement = $('#session-control-modal');
    this.handleUserActivity();
  }

  componentWillUnmount() {
    const { storageTokenKey } = this.props;

    if (storageTokenKey) {
      window.addEventListener('storage', this.handleStorageChange);
    }

    document.removeEventListener('mousemove', this.throttledHandleUserActivity);
    document.removeEventListener('keypress', this.throttledHandleUserActivity);
    clearInterval(this.inactivityTimeoutRef);
    clearInterval(this.modalTimerIntervalRef);
  }

  handleUserActivity() {
    const { isModalOpen } = this.state;
    const { inactivityTimeout } = this.props;

    if (isModalOpen) {
      clearInterval(this.modalTimerIntervalRef);
      const { modalInactivityTimeout } = this.props;
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
    this.setState({ isModalOpen: true }, () => {
      this.modalElement.modal('show');
      this.handleUserActivity();
    })
  }

  handleModalTimer() {
    const { onLogout, showDocumentTitleAlert, documentTitleAlertText } = this.props;
    const { modalTimer } = this.state;

    if (modalTimer === 0) {
      if (showDocumentTitleAlert) {
        document.title = this.originalDocumentTitle;
      }
      clearInterval(this.inactivityTimeoutRef);
      clearInterval(this.modalTimerIntervalRef);

      this.modalElement.modal('hide');
      this.setState({ isModalOpen: false }, () => {
        this.handleUserActivity();
      });
      
      onLogout && onLogout(LogoutTypes.inactivity);
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

    if (event.key === storageTokenKey || event.key === null) {
      this.handleStorageKeyChange(event);
    }
  }

  handleStorageKeyChange(event: any) {
    const { onLogout } = this.props;
    const { newValue } = event;
    if (newValue == null) {
      this.modalElement.modal('hide');
      onLogout && onLogout(LogoutTypes.lostToken);
    }
  }

  handleModalLogoutClick() {
    const { showDocumentTitleAlert, onLogout } = this.props;
    clearInterval(this.modalTimerIntervalRef);

    if (showDocumentTitleAlert) {
      document.title = this.originalDocumentTitle;
    }

    this.modalElement.modal('hide');
    this.setState({ isModalOpen: false }, () => {
      this.handleUserActivity();
    });

    onLogout && onLogout(LogoutTypes.button);
  }

  handleModalContinueClick() {
    const { showDocumentTitleAlert } = this.props;
    clearInterval(this.modalTimerIntervalRef);

    if (showDocumentTitleAlert) {
      document.title = this.originalDocumentTitle;
    }

    this.modalElement.modal('hide');
    this.setState({ isModalOpen: false }, () => {
      this.handleUserActivity();
    });
  }

  getProgressWidth() {
    const { modalInactivityTimeout } = this.props;
    const { modalTimer } = this.state;
    return `${modalTimer / modalInactivityTimeout * 100}%`;
  }

  render() {
    const { title, message, timerMessage, logoutButtonText, continueButtonText } = this.props;
    const { modalTotalTimer, modalTimer } = this.state;

    return (
      <div className="modal fade" id="session-control-modal" data-backdrop="static">
        <div className="modal-dialog ">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
            </div>
            <div className="modal-body">
              <p>{message}</p>
              <div className="timer-container">
                <div className="progress">
                  <div className="progress-bar progress-bar-striped bg-warning"
                    role="progressbar"
                    style={{ width: this.getProgressWidth() }}
                    aria-valuenow={100}
                    aria-valuemin={modalTimer}
                    aria-valuemax={modalTotalTimer}
                  />
                </div>
                <div className="timer-message">
                  <span>{timerMessage}{modalTimer}s</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-danger" data-dismiss="modal" onClick={this.handleModalLogoutClick} >{logoutButtonText}</button>
              <button type="button" className="btn btn-primary btn-primary" onClick={this.handleModalContinueClick} >{continueButtonText}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
