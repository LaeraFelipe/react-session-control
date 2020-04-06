import React, { PureComponent } from 'react';
import { debounce } from './utils';

export interface UnauthenticatedSessionControlProps {
  /**Key do check existence in local storage. */
  storageTokenKey: string,
  /**The time in miliseconds to debounce token changes.  */
  tokenChangeDebounceTime?: number,
  /**Callback to be called when token is registered on localStorage. */
  onLogin: () => void
}

export default class UnauthenticatedSessionControl extends PureComponent<UnauthenticatedSessionControlProps> {
  static defaultProps: Partial<UnauthenticatedSessionControlProps> = {
    tokenChangeDebounceTime: 500,
  }

  handleStorageKeyChangeDebounced: any;

  constructor(props: UnauthenticatedSessionControlProps) {
    super(props);

    const { tokenChangeDebounceTime } = props;

    this.handleStorageChange = this.handleStorageChange.bind(this);
    this.handleStorageKeyChangeDebounced = debounce(this.handleStorageKeyChange.bind(this), tokenChangeDebounceTime);
  }

  componentDidMount() {
    window.addEventListener('storage', this.handleStorageChange);
  }

  componentWillUnmount() {
    window.removeEventListener('storage', this.handleStorageChange);
  }

  handleStorageChange(event: any) {
    const { key } = event;
    const { storageTokenKey } = this.props;

    if (key === storageTokenKey) {
      this.handleStorageKeyChangeDebounced(event);
    }
  }

  handleStorageKeyChange({ newValue }: any) {
    const { onLogin } = this.props;
    if (newValue != null) {
      onLogin && onLogin();
    }
  }

  render() {
    return (false)
  }
}
