import { Buffer } from 'buffer';

import { Octokit } from 'octokit';

// @ts-ignore
// eslint-disable-next-line no-undef
window.Buffer = Buffer;

// eslint-disable-next-line consistent-return
const getCode = async (group, questionName) => {
  // Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
  const octokit = new Octokit({
    auth: process.env.REACT_APP_GITHUB_TOKEN,
  });

  try {
    // Compare: https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
    const {
      data: {
        login,
      },
    } = await octokit.rest.users.getAuthenticated();
    console.log(`GitHub API Connected, ${login}`);

    // Get File Contents
    const code = await octokit.rest.repos.getContent({
      owner: login,
      path: `prepalgo/${group}/${questionName}.py`,
      repo: 'Data_Structures_and_Algorithms',
    });

    // content will be base64 encoded
    const content = Buffer.from(code.data.content, 'base64').toString();
    return content;
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};

export default getCode;
