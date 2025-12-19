package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jessevdk/go-flags"
	"github.com/marcioecom/permit/internal/config"
	"github.com/marcioecom/permit/internal/database"
)

type Options struct {
	Up   bool `short:"u" long:"up" description:"Run all migrations"`
	Down bool `short:"d" long:"down" description:"Rollback all migrations"`
	Show bool `short:"s" long:"show" description:"Show all migrations"`
}

var (
	opts       Options
	optsParser = flags.NewParser(&opts, flags.Default)
)

func main() {
	// Parse flags
	if _, err := optsParser.Parse(); err != nil {
		if flagsErr, ok := err.(*flags.Error); ok && flagsErr.Type != flags.ErrHelp {
			fmt.Printf("Failed to parse args, err:\n%s\n", err)
		}
		os.Exit(0)
	}

	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	ctx := context.Background()
	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		panic(err)
	}

	switch {
	case opts.Up:
		err = db.MigrateUp(ctx)
	case opts.Down:
		err = db.MigrateDown(ctx)
	case opts.Show:
		err = db.MigrateShow(ctx)
	}

	if err != nil {
		panic(err)
	}
}
