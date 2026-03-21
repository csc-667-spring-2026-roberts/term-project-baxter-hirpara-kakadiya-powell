CREATE TABLE users (
    id         UUID PRIMARY KEY,
    username   VARCHAR(255)  NOT NULL UNIQUE,
    email      VARCHAR(255)  NOT NULL UNIQUE,
    password   VARCHAR(255)  NOT NULL,
    balance    DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE session (
    sid    VARCHAR     NOT NULL PRIMARY KEY,
    sess   JSON        NOT NULL,
    expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX "IDX_session_expire" ON session (expire);

CREATE TABLE tables (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255)  NOT NULL,
    max_seats   INT           NOT NULL,
    small_blind DECIMAL(12,2) NOT NULL,
    big_blind   DECIMAL(12,2) NOT NULL,
    created_at  TIMESTAMPTZ
);

CREATE TABLE cards (
    id   SMALLSERIAL PRIMARY KEY,
    rank VARCHAR(10) NOT NULL,
    suit VARCHAR(10) NOT NULL
);

CREATE TABLE games (
    id                BIGSERIAL PRIMARY KEY,
    table_id          BIGINT        NOT NULL REFERENCES tables(id),
    status            VARCHAR(50)   NOT NULL,
    started_at        TIMESTAMPTZ,
    ended_at          TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    current_player_id UUID          REFERENCES users(id),
    turn_deadline_at  TIMESTAMPTZ,
    pot_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    last_raise_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    deck_position     INT           NOT NULL
);

CREATE TABLE game_players (
    game_id   BIGINT        NOT NULL REFERENCES games(id),
    player_id UUID          NOT NULL REFERENCES users(id),
    seat_no   INT           NOT NULL,
    chips     DECIMAL(12,2) NOT NULL,
    status    VARCHAR(50)   NOT NULL,
    is_dealer BOOLEAN       NOT NULL,
    joined_at TIMESTAMPTZ,
    PRIMARY KEY (game_id, player_id)
);

CREATE TABLE game_deck (
    game_id  BIGINT   NOT NULL REFERENCES games(id),
    position INT      NOT NULL,
    card_id  SMALLINT NOT NULL REFERENCES cards(id),
    is_used  BOOLEAN  NOT NULL DEFAULT FALSE,
    PRIMARY KEY (game_id, position)
);

CREATE TABLE player_hand (
    game_id    BIGINT   NOT NULL REFERENCES games(id),
    player_id  UUID     NOT NULL REFERENCES users(id),
    card_id    SMALLINT NOT NULL REFERENCES cards(id),
    card_index INT      NOT NULL CHECK (card_index IN (1, 2)),
    PRIMARY KEY (game_id, player_id, card_index)
);

CREATE TABLE community_cards (
    game_id  BIGINT      NOT NULL REFERENCES games(id),
    card_id  SMALLINT    NOT NULL REFERENCES cards(id),
    street   VARCHAR(10) NOT NULL CHECK (street IN ('flop', 'turn', 'river')),
    position INT         NOT NULL,
    PRIMARY KEY (game_id, street, position)
);
