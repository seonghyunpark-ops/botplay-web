import{initializeApp}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import{getAuth,setPersistence,browserSessionPersistence,signInWithEmailLink,isSignInWithEmailLink,signOut}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
const status=document.querySelector('#status'),button=document.querySelector('#confirm'),form=document.querySelector('#form');
const state=new URLSearchParams(location.search).get('state');
try{
 const config=await(await fetch('/auth-config.json',{cache:'no-store'})).json();
 const auth=getAuth(initializeApp(config,'email-app-handoff'));await setPersistence(auth,browserSessionPersistence);
 if(!/^[a-f0-9]{64}$/.test(state||'')||!isSignInWithEmailLink(auth,location.href))throw Error('메일에서 유효한 인증 링크를 열어 주세요.');
 form.onsubmit=async e=>{e.preventDefault();button.disabled=true;try{
  const email=document.querySelector('#email').value.trim(),result=await signInWithEmailLink(auth,email,location.href);
  const r=await fetch(config.authApi+'/email/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,idToken:await result.user.getIdToken()}),signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('앱 인증 시간이 지났거나 이메일이 일치하지 않아요. 앱에서 다시 요청해 주세요.');
  history.replaceState(null,'','/email-app-auth.html');await signOut(auth);form.hidden=true;status.textContent='인증을 완료했어요. 앱을 열면 가입 또는 로그인이 이어집니다.';document.querySelector('#open').hidden=false;
 }catch(e){status.textContent=e.message;button.disabled=false}};
}catch(e){status.textContent=e.message;button.disabled=true}
