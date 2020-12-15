package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"

	"github.com/lucasb-eyer/go-colorful"
	"github.com/syncromatics/go-kit/v2/cmd"
)

const (
	pinR = 17
	pinG = 27
	pinB = 22

	fps = 30
)

func main() {
	group := cmd.NewProcessGroup(context.Background())
	hue := 0.0

	command := exec.Command("./pi-blaster", "--foreground")
	command.Start()
	group.Go(func() error {
		select {
		case <-group.Context().Done():
			err := command.Process.Kill()
			return err
		}
	})
	group.Go(func() error {
		return command.Wait()
	})

	group.Go(func() error {
		dev := "/dev/pi-blaster"
		for {
			_, err := os.Stat(dev)
			if err == nil {
				break
			}

			select {
			case <-time.After(time.Second):
			case <-group.Context().Done():
				return nil
			}
		}

		f, err := os.Create(dev)
		if err != nil {
			return err
		}

		defer f.Close()
		for {
			select {
			case <-time.After(time.Second / fps):
				hue++
				if hue > 360 {
					hue -= 360
				}

				color := colorful.Hsl(hue, 1, 0.5)
				str := fmt.Sprintf("%d=%.2f %d=%.2f %d=%.2f\n",
					pinR, color.R,
					pinG, color.G,
					pinB, color.B)

				_, err := f.WriteString(str)
				if err != nil {
					return err
				}

				f.Sync()
			case <-group.Context().Done():
				return nil
			}
		}
	})

	err := group.Wait()
	if err != nil {
		panic(err)
	}
}
