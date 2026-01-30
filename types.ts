/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type WindowType = 'IMAGE' | 'TEXT' | 'CODE' | 'CAPTCHA' | 'ERROR';

export interface WindowData {
  id: string;
  type: WindowType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  title: string;
  content: any;
  rotation: number;
  isClosing?: boolean;
}

export interface Outcome {
  title: string;
  message: string;
  type: 'verified' | 'crash';
}

export interface Artifact {
  id: string;
  html: string;
  styleName: string;
  status: 'streaming' | 'complete';
}