Messages stored on the jetstream. 
The jetstream stores all of the messages on the subject.
Once a chatter joins a chat room, they receive an 'instant' replay of the all the messages published to that subject. 

Maximum message age.
Maximum total stream size (in bytes).
Maximum number of messages in the stream.
Maximum individual message size.
You can also set limits on the number of consumers that can be defined for the stream at any given point in time.

Discard policy: discard old to make way for the stream to make room for more messages

Memory or file storage?

Message set: CHAT
Subjects: CHAT.*

push based - messages will be delivered to a specified subject

One consumer per room, then whenever a chatter joins, they subscribe to that consumer.


Watch all in the KV store. Associate a room with a bucket, KV store in the bucket will represent the messages. 
Keys: TimeStamp+UserID
Values: the actual chat message. 
When a user joins a chat room, they access the bucket by acting as a consumer.
Use a for loop to "get" all the KV values.

