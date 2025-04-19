import axios from 'axios';

export function login({
  email, password,
}) {
  console.log('login API: ', {
    email,
    password,
  });
  return axios.post(
    `${process.env.REACT_APP_API_BASE_URI}/authentication/signin`,
    {
      email,
      password,
    }
  );
}

export function loginWithGoogle(googleUserData) {
  console.log('Google login API: ', googleUserData);
  return axios.post(
    `${process.env.REACT_APP_API_BASE_URI}/authentication/google`,
    googleUserData
  );
}
