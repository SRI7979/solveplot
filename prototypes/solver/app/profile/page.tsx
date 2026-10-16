'use client';

import { ProfileAvatar, useWorkspace } from '../workspace';

export default function ProfilePage() {
  const { profileName, updateProfileName, toast } = useWorkspace();
  return <main className="wsPage"><div className="wsPageInner wsProfilePage">
    <header className="wsPageHeading"><h1>Your profile</h1><p>Choose the name shown in your workspace.</p></header>
    <div className="wsProfileIntro"><ProfileAvatar large /><div><h2>{profileName.trim() || 'Your profile'}</h2><p>Personal workspace</p></div></div>
    <form className="wsProfileForm" onSubmit={event => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('displayName') ?? '').trim().slice(0, 50); updateProfileName(name); toast('Profile updated'); }}><label htmlFor="profile-name">Display name</label><input id="profile-name" name="displayName" type="text" key={profileName} defaultValue={profileName} maxLength={50} autoComplete="given-name" placeholder="Your name" /><button type="submit" className="secondaryButton">Save changes</button></form>
    <p className="wsProfileNote">This is a frontend preview, so there’s no account connected. Your name and saved tricks stay in this browser tab for the session.</p>
  </div></main>;
}
