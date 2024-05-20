// __mocks__/axios.js

export const CognitoJwtVerifier = {
    create: jest.fn(() => ({ "cognito-groups": [] })),
};
