"use client";

import { useActionState, useEffect } from "react";
import { changePassword, signIn } from "./actions";
import { notify } from "./Notices";

export function SignIn() {
  const [state, action, pending] = useActionState(signIn, {});
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.message && (
        <p className="error" role="alert">
          {state.message}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function Password() {
  const [state, action, pending] = useActionState(changePassword, {});
  useEffect(() => {
    if (state.message) notify(state.message, { error: !state.done });
  }, [state]);
  return (
    <form action={action} className="inline">
      <div className="field">
        <label htmlFor="new-password">A new password</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </div>
      <button className="button plain" disabled={pending}>
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
