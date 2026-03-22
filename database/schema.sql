CREATE TABLE users(
	id UUID PRIMARY KEY,
	username VARCHAR(255) NOT NULL UNIQUE,
	email VARCHAR(255) NOT NULL UNIQUE,
	password varchar(255) NOT NULL,
	balance decimal(12, 2) NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE session(
	sid VARCHAR NOT NULL PRIMARY KEY,
	sess JSON NOT NULL,
	expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX "IDX_session_expire" ON session(expire);

CREATE TABLE games(
	id UUID PRIMARY KEY,
	-- game status
	-- enum GameStatus {
	--   WAITING = 0,
	--   PLAYING = 1,
	--   PAUSED = 2,
	--   ENDED = 3,
	-- }
	status SMALLINT NOT NULL CHECK (status BETWEEN 0 AND 3),
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	ended_at TIMESTAMPTZ,
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	pot_amount decimal(12, 2) NOT NULL DEFAULT 0,
	turn_deadline_at TIMESTAMPTZ,
	current_player_id UUID REFERENCES users(id),
	max_seats INT NOT NULL,
	small_blind decimal(12, 2) NOT NULL,
	big_blind decimal(12, 2) NOT NULL,
	last_raise_amount decimal(12, 2) NOT NULL DEFAULT 0,
	deck_position INT NOT NULL
);

CREATE INDEX "IDX_games_status_created_at" ON games(status, created_at);

CREATE TABLE game_users(
	game_id UUID NOT NULL REFERENCES games(id),
	user_id UUID NOT NULL REFERENCES users(id),
	seat_no INT NOT NULL,
	balance decimal(12, 2) NOT NULL,
	-- user status within a game
	-- enum UserStatus {
	--   ACTIVE = 0,
	--   INACTIVE = 1,
	--   PAUSED = 2,
	-- }
	status SMALLINT NOT NULL CHECK (status BETWEEN 0 AND 2),
	is_dealer BOOLEAN NOT NULL,
	joined_at TIMESTAMPTZ,
	PRIMARY KEY (game_id, user_id)
);

-- index for both lookup predicates of composite key
CREATE INDEX "IDX_game_users_user_id" ON game_users(user_id);

CREATE TABLE game_cards(
	game_id UUID NOT NULL REFERENCES games(id),
	position INT NOT NULL,
	card SMALLINT NOT NULL CHECK (card BETWEEN 0 AND 51),
	-- card location on the board
	-- enum CardLocation {
	--   DECK = 0,
	--   COMMUNITY = 1,
	--   HAND = 2,
	-- }
	location SMALLINT NOT NULL CHECK (location BETWEEN 0 AND 2),
	user_id UUID REFERENCES users(id),
	PRIMARY KEY (game_id, position)
);

-- for history of games
--  * can lookup balance history of player, to display previous player
--    transactions
--  * can lookup all game actions of game, to display play-by-play of previous
--    games
CREATE TABLE game_actions(
	id BIGSERIAL PRIMARY KEY,
	game_id UUID NOT NULL REFERENCES games(id),
	user_id UUID REFERENCES users(id),
	-- game action types
	-- enum GameAction {
	--   DEAL_COMMUNITY = 0,
	--   DEAL_HAND = 1,
	--   BET = 2,
	--   CALL = 3,
	--   RAISE = 4,
	--   CHECK = 5,
	--   FOLD = 6,
	--   ALL_IN = 7,
	--   SHOWDOWN = 8,
	--   PAYOUT = 9,
	-- }
	action SMALLINT NOT NULL CHECK (action BETWEEN 0 AND 9),
	amount decimal(12, 2),
	deck_position INT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "IDX_game_actions_game_id" ON game_actions(game_id);

CREATE INDEX "IDX_game_actions_user_id" ON game_actions(user_id);

CREATE TABLE messages(
	-- no UUID, because always routed through UUID at API endpoint, so BIGSERIAL
	-- doesn't need to be hidden
	id BIGSERIAL PRIMARY KEY,
	-- user can send to either game chat or private chat, so user_from
	-- (originator) can never be null, but recipient can be game_id or user_to
	user_from UUID NOT NULL REFERENCES users(id),
	user_to UUID REFERENCES users(id),
	game_id UUID REFERENCES games(id),
	CHECK ((game_id IS NOT NULL AND user_to IS NULL) OR (game_id IS NULL AND user_to IS NOT NULL)),
	-- empty string in case of null. never accept a message that's truly null
	body TEXT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- index for fast lookup of game messages
CREATE INDEX "IDX_messages_game_id" ON messages(game_id);

-- index for fast lookup of recipient inbox
CREATE INDEX "IDX_messages_user_to" ON messages(user_to);

-- index for fast lookup of sender outbox
CREATE INDEX "IDX_messages_user_from" ON messages(user_from);
