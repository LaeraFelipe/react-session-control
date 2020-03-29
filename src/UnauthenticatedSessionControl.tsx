import React, { PureComponent } from 'react';
import { debounce } from './utils';

export interface UnauthenticatedSessionControlProps {
  storageTokenKey: string,
  onLogin: () => void;
}

export default class UnauthenticatedSessionControl extends PureComponent<UnauthenticatedSessionControlProps> {

  handleStorageKeyChangeDebounced: any;

  constructor(props: UnauthenticatedSessionControlProps) {
    super(props);

    this.handleStorageChange = this.handleStorageChange.bind(this);
    this.handleStorageKeyChangeDebounced = debounce(this.handleStorageKeyChange.bind(this), 500);
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
