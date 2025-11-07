import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress 402 payment errors in console (expected when payment isn't set up)
const originalError = console.error;
const originalWarn = console.warn;

const shouldSuppressError = (args: any[]): boolean => {
  const message = args.map(arg => {
    if (typeof arg === 'string') return arg;
    if (arg?.message) return arg.message;
    if (arg?.toString) return arg.toString();
    return String(arg);
  }).join(' ').toLowerCase();
  
  // Check for 402/payment related errors
  return (
    message.includes('402') ||
    message.includes('payment required') ||
    message.includes('payment') && message.includes('generate-campaign') ||
    message.includes('functionshttperror') && message.includes('402') ||
    args.some(arg => arg?.status === 402 || arg?.statusCode === 402)
  );
};

console.error = (...args: any[]) => {
  if (shouldSuppressError(args)) {
    // Silent - payment errors are expected
    return;
  }
  originalError(...args);
};

console.warn = (...args: any[]) => {
  if (shouldSuppressError(args)) {
    // Silent - payment errors are expected
    return;
  }
  originalWarn(...args);
};

// Also intercept unhandled promise rejections for 402 errors
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const errorMessage = (error?.message || error?.toString() || '').toLowerCase();
  const errorStatus = error?.status || error?.statusCode;
  
  if (
    errorStatus === 402 ||
    errorMessage.includes('402') ||
    errorMessage.includes('payment required') ||
    errorMessage.includes('functionshttperror') && errorMessage.includes('402') ||
    (errorMessage.includes('generate-campaign') && errorMessage.includes('402'))
  ) {
    event.preventDefault(); // Prevent default error logging
    event.stopPropagation(); // Stop propagation
  }
});

createRoot(document.getElementById("root")!).render(<App />);
