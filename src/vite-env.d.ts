/// <reference types="vite/client" />

// Declare module for raw Python file imports
declare module '*.py?raw' {
  const content: string;
  export default content;
}
