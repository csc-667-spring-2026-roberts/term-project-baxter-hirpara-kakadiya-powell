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
	status VARCHAR(50) NOT NULL,
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

CREATE TABLE game_users(
	game_id UUID NOT NULL REFERENCES games(id),
	user_id UUID NOT NULL REFERENCES users(id),
	seat_no INT NOT NULL,
	balance decimal(12, 2) NOT NULL,
	status VARCHAR(50) NOT NULL,
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
	location SMALLINT NOT NULL DEFAULT 0,
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
	action SMALLINT NOT NULL,
	amount decimal(12, 2),
	deck_position INT NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "IDX_game_actions_game_id" ON game_actions(game_id);

CREATE INDEX "IDX_game_actions_user_id" ON game_actions(user_id);
