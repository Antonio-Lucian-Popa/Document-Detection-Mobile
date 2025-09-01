import { apiNoAuth } from './http';
import { AuthTokens } from './tokenStorage';
import { getAccessExp } from './jwt';

type LoginPayload = { username: string; password: string };
type LoginResponse = {
  access: string;   // <— de la backend
  refresh: string;  // <— de la backend
};

export async function loginReq(payload: LoginPayload): Promise<{ tokens: AuthTokens }> {
  const { data } = await (apiNoAuth.post('/rest_api/token/', payload) as Promise<{ data: LoginResponse }>);
  const accessExp = getAccessExp(data.access); // epoch seconds din JWT
  console.log('Login response:', data, accessExp);
  return {
    tokens: {
      accessToken: data.access,
      refreshToken: data.refresh,
      accessExp, // putem folosi pentru pre-refresh sau afișare
    },
  };
}
