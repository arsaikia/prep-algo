/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect } from 'react';

import {
  Formik, Form, Field, ErrorMessage,
} from 'formik';
import {
  useDispatch, useSelector,
} from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { userSignup } from '../actions/actions';
import {
  CenteredFlex, Container, Flex,
} from '../styles';

function Signup() {
  const navigate = useNavigate();

  // Get states using useSelector ( state -> reducerName )
  const isSignedUp = useSelector((state) => state.auth.isSignedUp);

  // Dispatch actions ( action -> Saga Watcher )
  const dispatch = useDispatch();
  const signupUser = (values) => dispatch(userSignup(values));

  /** *******************************************************************
     * HANDLER FUNCTIONS
     ******************************************************************** */
  const handleSubmit = (values, {
    setSubmitting,
  }) => {
    signupUser(values);
    setSubmitting(false);
  };

  useEffect(() => {
    if (isSignedUp) {
      navigate('/login');
    } else {
      console.error('Sign up failed.');
    }
  }, [isSignedUp]);

  /** *******************************************************************
     * RETURNS JSX FROM HERE
     ******************************************************************** */
  return (
    <CenteredFlex minHeight="90vh">
      <Container
        direction="column"
        minWidth="20vw"
        minHeight="40vh"
        padding="20px 20px"
        background="#f9f9f9"
        boxShadow="rgba(0, 0, 0, 0.1) 0px 4px 12px"
      >
        <h1 style={{
          textAlign: 'center',
        }}
        >
          Sign up
        </h1>

        <Formik
          initialValues={{
            email: '',
            firstName: '',
            lastName: '',
            password: '',
          }}
          validate={(values) => {
            const errors = {};
            if (!values.email) {
              errors.email = 'Email Required';
            }
            if (!values.firstName) {
              errors.firstName = 'First Name Required';
            }
            if (!values.lastName) {
              errors.lastName = 'Last Name Required';
            }
            if (!values.password) {
              errors.password = 'Password Required';
            }
            if (!/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/i.test(values.password)) {
              errors.password = (
                <span>
                  Password requirements:
                  <ul>
                    <li>At-least 1uppercase</li>
                    <li>1 lowercase</li>
                    <li>1 digit</li>
                    <li>1 special character</li>
                    <li>minimum 8 characters</li>
                  </ul>
                </span>
              );
            }
            if (
              !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email)
            ) {
              errors.email = 'Invalid email address';
            }
            return errors;
          }}
          onSubmit={handleSubmit}
        >
          {({
            isSubmitting,
          }) => (
            <Form>
              <CenteredFlex direction="column" minWidth="20vw">
                {/* Error containers below */}
                <CenteredFlex direction="column" background="rgba(238,221,235,0.4)" width="100%">
                  <ErrorMessage className="error" name="email" component="div" />
                  <ErrorMessage className="error" name="firstName" component="div" />
                  <ErrorMessage className="error" name="lastName" component="div" />
                  <ErrorMessage className="error" name="password" component="div" />
                </CenteredFlex>
                <Container padding="0.4rem 0" width="100%">
                  <label style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                  >
                    First Name:
                    {' '}
                    <Field type="text" name="firstName" />
                  </label>
                </Container>
                <Container padding="0.4rem 0" width="100%">
                  <label style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                  >
                    Last Name:
                    {' '}
                    <Field type="text" name="lastName" />
                  </label>
                </Container>
                <Flex padding="0.4rem 0" width="100%" background="" justifyContent="space-between">
                  <label style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                  >
                    Email:
                    <Field type="email" name="email" />
                  </label>
                </Flex>
                <Container padding="0.4rem 0" width="100%">
                  <label style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                  >
                    Password:
                    {' '}
                    <Field type="password" name="password" />
                  </label>
                </Container>
                <CenteredFlex padding="0.4rem 0" width="100%">
                  <button className="button-4" type="submit" disabled={isSubmitting}>
                    Submit
                  </button>
                </CenteredFlex>
              </CenteredFlex>
            </Form>
          )}
        </Formik>
      </Container>
    </CenteredFlex>
  );
}

export default Signup;
