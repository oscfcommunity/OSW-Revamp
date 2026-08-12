/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import('./lib/auth').SessionUser | null;
    session: import('./lib/auth').SessionData | null;
    viewer: import('./lib/guards').Viewer | null;
  }
}
