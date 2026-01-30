/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const generateRandomCode = (lines: number = 20) => {
    const snippets = [
        "0x4F3A void main() {",
        "  system.failure(0x00);",
        "  if (human) break;",
        "  // MEMORY LEAK DETECTED",
        "  while(true) { spawn(); }",
        "  <buffer_overflow>",
        "  segmentation fault (core dumped)",
        "  00101010 11001010",
        "  ERROR: CAPTCHA_FAILED",
        "  retrieving: chihuahua.jpg",
        "  analyzing texture...",
        "  geometry.collision(true);"
    ];
    let code = "";
    for(let i=0; i<lines; i++) {
        code += randomItem(snippets) + "\n";
    }
    return code;
};

export const ASCII_CHARS = ['+', '-', '=', ':', '.', '*', '#', '@', '%'];
