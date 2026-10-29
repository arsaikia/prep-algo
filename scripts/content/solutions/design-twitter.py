# @solution per-user-timeline-heap accept
import heapq

class Twitter:
    def __init__(self):
        self.time = 0
        self.tweets = {}
        self.following = {}

    def postTweet(self, userId, tweetId):
        self.tweets.setdefault(userId, []).append((self.time, tweetId))
        self.time += 1

    def getNewsFeed(self, userId):
        authors = self.following.get(userId, set()) | {userId}
        heap = []
        for author in authors:
            timeline = self.tweets.get(author, [])
            if timeline:
                index = len(timeline) - 1
                time, tweet = timeline[index]
                heapq.heappush(heap, (-time, tweet, author, index))
        feed = []
        while heap and len(feed) < 10:
            _, tweet, author, index = heapq.heappop(heap)
            feed.append(tweet)
            if index:
                time, older_tweet = self.tweets[author][index - 1]
                heapq.heappush(heap, (-time, older_tweet, author, index - 1))
        return feed

    def follow(self, followerId, followeeId):
        if followerId != followeeId:
            self.following.setdefault(followerId, set()).add(followeeId)

    def unfollow(self, followerId, followeeId):
        self.following.get(followerId, set()).discard(followeeId)

# @solution collect-and-sort-tweets accept
class Twitter:
    def __init__(self):
        self.time = 0
        self.tweets = {}
        self.following = {}

    def postTweet(self, userId, tweetId):
        self.tweets.setdefault(userId, []).append((self.time, tweetId))
        self.time += 1

    def getNewsFeed(self, userId):
        authors = self.following.get(userId, set()) | {userId}
        all_tweets = []
        for author in authors:
            all_tweets.extend(self.tweets.get(author, ()))
        all_tweets.sort(reverse=True)
        return [tweet for _, tweet in all_tweets[:10]]

    def follow(self, followerId, followeeId):
        if followerId != followeeId:
            self.following.setdefault(followerId, set()).add(followeeId)

    def unfollow(self, followerId, followeeId):
        self.following.get(followerId, set()).discard(followeeId)
# @solution excludes-followed-authors reject
class Twitter:
    def __init__(self):
        self.tweets = {}
    def postTweet(self, userId, tweetId):
        self.tweets.setdefault(userId, []).append(tweetId)
    def getNewsFeed(self, userId):
        return self.tweets.get(userId, [])[-10:][::-1]
    def follow(self, followerId, followeeId):
        pass
    def unfollow(self, followerId, followeeId):
        pass

