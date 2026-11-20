import { CarryPyApi } from '@shared/api';

declare global {
  interface Window {
    carrypy: CarryPyApi;
  }
}

export {};