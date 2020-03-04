const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

  // TODO: Note the presence of `static` keyword: this indicates that getStories
  // is **not** an instance method. Rather, it is a method that is called on the
  // class directly. Why doesn't it make sense for getStories to be an instance method?

  // Class is a blueprint- like a template
  // exactly what a object can have 
  // like a house and how to build it
  // object will have same variables

  // instance is built off a class
  //static does not belong to an instance, only a class
  //can only be used once

  static async getStories() {
    // query the /stories endpoint (no auth required)
    const response = await axios.get(`${BASE_URL}/stories`);

    // turn the plain old story objects from the API into instances of the Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    const storyList = new StoryList(stories);
    return storyList;
  }

  /**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

  /**
   * 
  TERMINAL
  curl -i \
      -H "Content-Type: application/json" \
      -X POST \
      -d '{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJlZWJlZXppZSIsImlhdCI6MTU4MzAyODUyN30.KR9WAG2t4cVo_sPbXiyOKSq5WE_XfRLsRHVL-IfIT4E", 
          "story": {
            "author":"Reber Fever!",
            "title": "My GitHub =]", 
            "url": "https://github.com/kevinreber"
          }
        }' \
        https://hack-or-snooze-v3.herokuapp.com/stories

  STORY POSTED
  {
    "story": {
      "author": "Reber Fever!",
      "createdAt": "2020-03-01T02:21:17.896Z",
      "storyId": "fb685d70-638c-4222-8e16-b3bc96ba08cb",
      "title": "My GitHub =]",
      "updatedAt": "2020-03-01T02:21:17.896Z",
      "url": "https://github.com/kevinreber",
      "username": "reebeezie"
    }
  }
  *
  **/

  async addStory(user, newStory) {
    // this function should return the newly created story so it can be used in
    // the script.js file where it will be appended to the DOM
    // function is called when user submits a story

    // post to API
    const response = await axios({
      method: "POST",
      url: `${BASE_URL}/stories`,
      data: {
        // request body - example of API structure above
        token: user.loginToken,
        story: newStory // pass newStory to post on API and return response 
      }
    });

    // Make story instance of data received
    newStory = new Story(response.data.story);

    // Add newStory to beginning of stories array
    this.stories.unshift(newStory);
    // Add newStory to beginning of users own stories array
    user.ownStories.unshift(newStory);

    // Return object to generateStoryHTML and prepend to $allStoriesList 
    return newStory;
  }
}


/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  /* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name
      }
    });

    // build a new User instance from the API response
    const newUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    newUser.loginToken = response.data.token;

    return newUser;
  }

  /* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password
      }
    });

    // build a new User instance from the API response
    const existingUser = new User(response.data.user);

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = response.data.token;

    return existingUser;
  }

  /** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

  static async getLoggedInUser(token, username) {
    // if we don't have user info, return null
    if (!token || !username) return null;

    // call the API
    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {
        token
      }
    });

    // instantiate the user from the API information
    const existingUser = new User(response.data.user);

    // attach the token to the newUser instance for convenience
    existingUser.loginToken = token;

    // instantiate Story instances for the user's favorites and ownStories
    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
    return existingUser;
  }

  async updateUserData() {
    const response = await axios({
      url: `${BASE_URL}/users/${this.username}`,
      params: {
        token: this.loginToken // token needed to access user
      }
    });

    this.name = response.data.user.name; //Update name if any changes
    this.createdAt = response.data.createdAt;
    this.updatedAt = response.data.updatedAt;

    // these are all set to defaults, not passed in by the constructor
    this.favorites = response.data.user.favorites.map(s => new Story(s));
    this.ownStories = response.data.user.stories.map(s => new Story(s));

    return this;
  }

  // Update User's favorites
  async updateFavorites(storyId, method) {
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      method: method,
      params: {
        token: this.loginToken
      }
    });

    await this.updateUserData();
    return this;
  }
}

/**
 * Class to represent a single story.
 */

class Story {

  /**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
}


//STEP 2 - TOKEN 
// {
// "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3RyZWVieiIsImlhdCI6MTU4MzAyNjU3Nn0.HNOc9DzYEgTzb6gRQ9xQkq7Il3rK7g05hLq2buaPVX0", 
//  "user": {
//    "createdAt": "2020-03-01T01:36:16.765Z",
//    "favorites": [],
//    "name": "Test User",
//    "stories": [],
//    "updatedAt": "2020-03-01T01:36:16.765Z",
//    "username": "testreebz"
//  }
// }

//STEP 3 - MAKE STORY
// {
//   "story": {
//     "author": "Elie Schoppik",
//     "createdAt": "2020-03-01T01:46:06.917Z",
//     "storyId": "364621ba-a91d-4afe-ad93-bb368bf8ae6b",
//     "title": "Four Tips for Moving Faster as a Developer",
//     "updatedAt": "2020-03-01T01:46:06.917Z",
//     "url": "https://www.rithmschool.com/blog/developer-productivity",
//     "username": "testreebz"
//   }
// }

// REEBEEZIE
// {
//   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJlZWJlZXppZSIsImlhdCI6MTU4MzAyODUyN30.KR9WAG2t4cVo_sPbXiyOKSq5WE_XfRLsRHVL-IfIT4E",
//   "user": {
//     "createdAt": "2020-03-01T02:08:47.592Z",
//     "favorites": [],
//     "name": "Test User",
//     "stories": [],
//     "updatedAt": "2020-03-01T02:08:47.592Z",
//     "username": "reebeezie"
//   }
// }


// TERMINAL
// curl -i \
//      -H "Content-Type: application/json" \
//      -X POST \
//      -d '{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJlZWJlZXppZSIsImlhdCI6MTU4MzAyODUyN30.KR9WAG2t4cVo_sPbXiyOKSq5WE_XfRLsRHVL-IfIT4E", "story": {"author":"Reber Fever!","title": "My GitHub =]", "url": "https://github.com/kevinreber"}}' \
//       https://hack-or-snooze-v3.herokuapp.com/stories

// STORY POSTED
// {
//   "story": {
//     "author": "Reber Fever!",
//     "createdAt": "2020-03-01T02:21:17.896Z",
//     "storyId": "fb685d70-638c-4222-8e16-b3bc96ba08cb",
//     "title": "My GitHub =]",
//     "updatedAt": "2020-03-01T02:21:17.896Z",
//     "url": "https://github.com/kevinreber",
//     "username": "reebeezie"
//   }
// }