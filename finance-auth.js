import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {initializeAuth,browserSessionPersistence,browserPopupRedirectResolver,GoogleAuthProvider,signInWithRedirect,getRedirectResult,signOut} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
const status=document.querySelector('#status'),button=document.querySelector('#login');
// 관리자 목록과 출처는 서버(functions/security.mjs)에서도 다시 확인합니다. 여기서는 잘못된 계정으로 진행하지 않게 미리 막을 뿐입니다.
const admins=['seonghyun.park@theant.kr','psh920122@gmail.com','theantplay55@gmail.com','lee.ike1@gmail.com'];
const origins=['https://botplay-dfebc.web.app','https://botplay-dfebc.firebaseapp.com'];
const dashboard='https://seonghyunpark-ops.github.io/game-dashboard/';
try {
  // 같은 출처 리디렉션 인증과 /api/finance/* 프록시는 Firebase Hosting에서만 동작합니다.
  if(!origins.includes(location.origin)) throw Error('botplay-dfebc.web.app에서 연결해 주세요.');
  const config=await (await fetch('/auth-config.json',{cache:'no-store'})).json();
  const auth=initializeAuth(initializeApp({...config,authDomain:location.hostname},'finance-readonly'),{persistence:browserSessionPersistence,popupRedirectResolver:browserPopupRedirectResolver});
  if(new URLSearchParams(location.search).get('auto')==='1') sessionStorage.setItem('finance.auto','1');
  const month=new URLSearchParams(location.search).get('month')||sessionStorage.getItem('finance.month');
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month||'')) throw Error('대시보드에서 집계 월을 선택해 주세요.');
  button.onclick=async()=>{
    button.disabled=true;
    try {sessionStorage.setItem('finance.month',month);sessionStorage.setItem('finance.pending','1');const p=new GoogleAuthProvider();p.addScope('https://www.googleapis.com/auth/admob.readonly');p.setCustomParameters({prompt:'select_account'});await signInWithRedirect(auth,p);}catch(e){status.textContent=e.message;button.disabled=false;}
  };
  const pending=sessionStorage.getItem('finance.pending');
  const result=await getRedirectResult(auth);
  if(pending){
    sessionStorage.removeItem('finance.pending');
    try {
      if(!result?.user?.emailVerified||!admins.includes(result.user.email?.toLowerCase())) throw Error('지정된 관리 계정으로 인증을 완료해 주세요.');
      if(sessionStorage.getItem('finance.auto')==='1') {
        const r=await fetch('/api/finance/auto/start',{method:'POST',headers:{'X-Firebase-Token':await result.user.getIdToken(),'Content-Type':'application/json'},body:'{}'});
        const d=await r.json();if(!r.ok)throw Error(d.error);sessionStorage.removeItem('finance.auto');await signOut(auth);location.assign(d.url);
      } else {
      const token=GoogleAuthProvider.credentialFromResult(result)?.accessToken;
      if(!token) throw Error('Google 광고 조회 토큰을 받지 못했습니다.');
      status.textContent='Google 인증 완료. 광고 수익을 읽고 있습니다…';
      const response=await fetch('/api/finance/admob',{method:'POST',headers:{'X-Firebase-Token':await result.user.getIdToken(),'Content-Type':'application/json'},body:JSON.stringify({month,token}),signal:AbortSignal.timeout(55000)});
      if(!response.headers.get('content-type')?.includes('application/json'))throw Error('수익 조회 서버에 연결하지 못했습니다. 잠시 후 다시 연결해 주세요.');
      const data=await response.json();if(!response.ok)throw Error(data.error||'수익 조회에 실패했습니다.');
      status.textContent=`${month} 광고 수익 ${data.rows}개 내역을 연결했습니다. 대시보드로 이동합니다.`;
      await signOut(auth);location.replace(dashboard);
      }
    }catch(e){status.textContent=e.message;button.hidden=false;await signOut(auth);}
  }else{status.textContent=`${month} 광고 수익을 조회합니다. 아래 버튼으로 Google 계정을 선택해 주세요.`;button.hidden=false;}
}catch(e){status.textContent=e.message;}
