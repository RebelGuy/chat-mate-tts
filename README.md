# chat-mate-tts

Prototype for text-to-speech integration with ChatMate using [Zonos](https://github.com/Zyphra/Zonos). Livestream chat messages are converted to audio as they come in, then automatically played to the user.


## Dependencies

- `docker`
  - `sudo apt install docker.io`
- `docker-compose`
  - `sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose`
  - `sudo chmod +x /usr/local/bin/docker-compose`
- `nvidia-container-toolkit`
  - ```curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
    && curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
      sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
      sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
  - `sudo apt-get install -y nvidia-container-toolkit`
  - `sudo nvidia-ctk runtime configure --runtime=docker`
  - `sudo systemctl restart docker`
- A running instance of [Zonos-API](https://github.com/PhialsBasement/Zonos-API)
  - `sudo docker-compose up zonos-api`
- [Bun](https://bun.sh/docs/installation)

To install dependencies:

```bash
bun install
```

## Running chat-mate-tts
To run:

```bash
bun run index.ts
```
