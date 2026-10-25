// @vitest-environment jsdom
import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,waitFor,cleanup,act} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import GoogleLogin from './components/GoogleLogin';
import {api} from './api';
vi.mock('./api',()=>({api:{get:vi.fn(),post:vi.fn()},errorMessage:()=> 'Sign-in failed'}));
afterEach(()=>{cleanup();vi.clearAllMocks();delete window.google;});
it('shows an unavailable Google option when credentials are not configured',async()=>{
  api.get.mockResolvedValue({data:{enabled:false}});
  render(<GoogleLogin onSuccess={vi.fn()} onError={vi.fn()}/>);
  expect(await screen.findByRole('button',{name:'Continue with Google'})).toBeDisabled();
  expect(api.post).not.toHaveBeenCalled();
});
it('exchanges the Google credential and challenge for the existing app session',async()=>{
  let config;
  window.google={accounts:{id:{initialize:vi.fn(value=>{config=value;}),renderButton:vi.fn()}}};
  api.get.mockResolvedValue({data:{enabled:true,clientId:'client-id',nonce:'nonce',challenge:'challenge'}});
  const session={token:'app-token',user:{name:'Gardener'}};
  api.post.mockResolvedValue({data:session});const onSuccess=vi.fn();
  render(<GoogleLogin onSuccess={onSuccess} onError={vi.fn()}/>);
  await waitFor(()=>expect(window.google.accounts.id.renderButton).toHaveBeenCalled());
  expect(config.nonce).toBe('nonce');
  await act(()=>config.callback({credential:'google-token'}));
  expect(api.post).toHaveBeenCalledWith('/auth/google',{credential:'google-token',challenge:'challenge'});
  expect(onSuccess).toHaveBeenCalledWith(session);
});
