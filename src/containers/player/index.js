import React, { Component } from 'react'
import { ScrollView } from 'react-native-web'
import isEqual from 'lodash/fp/isEqual'
import format from 'date-fns/format'
import PropTypes from 'prop-types'
import * as R from 'ramda'
import _ from 'lodash/fp'
import { Motion, spring } from 'react-motion'
import {
  lifecycle,
  compose,
  pure,
  withStateHandlers,
  branch,
  defaultProps,
  renderComponent
} from 'recompose'

import { withMouseEvent } from 'helpers/MouseEvent'
import { storeItem } from 'helpers/localStorage'
import {
  createPlaylist,
  search,
  getRelatedArtist,
  addTracksToPlaylist
} from 'api'
import { redirect } from 'helpers/window'
import {
  FlexBetween,
  FlexVerticalCenter,
  Flex,
  ColumnSection,
  AppContainer
} from 'components/style'
import { getItemFromStorage } from 'helpers/localStorage'
import Button from 'components/button'
import TextInput from 'components/textInput'
import Text from 'components/text'
import Modal from 'components/modal'

const springSetting1 = { stiffness: 180, damping: 10 }
const [count, width, height] = [11, 70, 90]

const randomNumber = maxLen => Math.floor(Math.random() * (maxLen + 1))

// const savePlaylist = ({ songArray, playlistName }) => {
//   this.setState({ saving: true })
//   window.localStorage.setItem('playlistName', playlistName)
//   window.localStorage.setItem('songArray', JSON.stringify(songArray))
//   window.location = '/save'
// }

// eslint-disable-next-line
class PlayerPure extends Component {
  playNextSong = () => {
    const { type, token, currentSong, songArray } = this.state

    const index = songArray.length - 1
    this.setState({ playAudio: false })

    return getRelatedArtist({ type, token })(currentSong.artists[0].id)
      .chain(artistRes =>
        search({ type, token })(
          artistRes.artists.length > 1
            ? artistRes.artists[randomNumber(artistRes.artists.length - 1)].name
            : currentSong.name
        )
      )
      .fork(console.error, res =>
        this.setState({
          currentSong: res.tracks.items
            .filter(o => o.preview_url)
            .filter(o => !isEqual(o, songArray[index]))
            .sort((a, b) => a.popularity - b.popularity)[0],
          playAudio: true
        })
      )
  }

  // handleMouseUp = () => {
  //   const { appWidth, mouseXY, songArray, currentSong } = this.state
  //   const [x, y] = mouseXY

  //   if (this.isAccept({ x, appWidth })) {
  //     this.setState({ songArray: [...songArray, currentSong] })
  //     this.resetAlbumPostion()
  //     return this.playNextSong()
  //   }
  //   if (this.isDecline({ x, appWidth })) {
  //     this.resetAlbumPostion()
  //     return this.playNextSong()
  //   }
  //   return this.resetAlbumPostion()
  // }

  // isAccept = ({ x, appWidth }) => x > (appWidth - 128 * 1.2) / 2 - 10
  // isDecline = ({ x, appWidth }) => x < -((appWidth - 128 * 1.2) / 2 - 10)

  render() {
    const {
      appWidth,
      mouseXY,
      isPressed,
      playAudio,
      currentSong,
      songArray,
      saving,
      savePlaylist,
      playlistName
    } = this.props
    const [x, y] = mouseXY

    const maxX = (appWidth - 134 * 1.2) / 2
    const minX = -((appWidth - 128 * 1.2) / 2)

    const maxY = 150
    const minY = -150

    const hasCallback = window.location.hash.length > 0

    const style = isPressed
      ? {
          translateX: Math.max(minX, Math.min(maxX, x)),
          translateY: Math.max(minY, Math.min(maxY, y)),
          scale: spring(1.2, springSetting1),
          boxShadow: spring((x - (3 * width - 50) / 2) / 15, springSetting1)
        }
      : {
          translateX: 0,
          translateY: 0,
          scale: spring(1.0, springSetting1),
          boxShadow: spring((x - (3 * width - 50) / 2) / 15, springSetting1)
        }
    return (
      <AppContainer>
        <Modal
          isOpen={savePlaylist}
          onAfterOpen={() => {}}
          onRequestClose={() => this.setState({ savePlaylist: false })}
          contentLabel="SaveModal"
          style={{
            content: {
              background: 'rgb(57, 57, 57)',
              borderRadius: '32px',
              top: '8px',
              left: '8px',
              right: '8px',
              bottom: '8px'
            }
          }}
        >
          <FlexVerticalCenter>
            <ScrollView
              style={{
                height: 'calc(100vh - 136px)',
                marginBottom: '16px',
                borderRadius: '32px',
                width: '100%'
              }}
            >
              {songArray.length > 0 &&
                songArray.map(o => (
                  <div
                    key={o.id}
                    style={{
                      width: 'calc(100% - 36px)',
                      padding: '8px 16px',
                      margin: '4px',
                      borderRadius: '32px',
                      backgroundColor: 'green',
                      color: 'white'
                    }}
                  >
                    <p>{`${o.name}`}</p>
                    <p style={{ fontSize: '12px' }}>{`${o.artists.map(
                      o => o.name
                    )}`}</p>
                  </div>
                ))}
            </ScrollView>
            <TextInput
              onChange={this.handlePlaylistTextChange}
              value={playlistName}
            />
            <div style={{ width: '192px' }}>
              <Flex>
                <Button
                  onClick={() => this.setState({ savePlaylist: false })}
                  secondary
                  text={'Back'}
                />
                <Button onClick={this.savePlaylist} text={'Save'} />
              </Flex>
            </div>
          </FlexVerticalCenter>
        </Modal>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <FlexBetween>
            <ColumnSection>
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  backgroundColor: `${
                    isPressed && this.isDecline({ x, appWidth })
                      ? 'red'
                      : 'transparent'
                  }`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    color: `${isPressed ? 'white' : 'transparent'}`,
                    fontSize: '24px',
                    marginTop: '22px',
                    transition: '400ms ease 50ms'
                  }}
                >
                  X
                </div>
              </div>
            </ColumnSection>

            <ColumnSection>
              {playAudio && (
                <audio autoPlay className="player" preload="false">
                  <source src={currentSong.preview_url} />
                </audio>
              )}
              <Text size="large" text={'test'} isBlur={isPressed} />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: '-64px',
                  marginRight: '-64px',
                  height: 'calc(100vh - 400px)'
                }}
              >
                <Text size="large" text={currentSong.name} isBlur={isPressed} />
                <Text
                  size="medium"
                  text={currentSong.artists[0].name}
                  isBlur={isPressed}
                />
              </div>
              <Motion style={style}>
                {({ translateX, translateY, scale, boxShadow }) => (
                  <div
                    onMouseDown={this.handleMouseDown.bind(null, [x, y])}
                    onTouchStart={this.handleTouchStart.bind(null, [x, y])}
                    style={{
                      borderRadius: '100%',
                      WebkitTransform: `translate3d(${translateX}px, ${
                        translateY
                      }px, 0) scale(${scale})`,
                      transform: `translate3d(${translateX}px, ${
                        translateY
                      }px, 0) scale(${scale})`,
                      boxShadow: `${boxShadow}px 5px 5px rgba(0,0,0,0.5)`,
                      backgroundImage: `url(${
                        currentSong.album.images[0].url
                      })`,
                      height: '128px',
                      width: '128px',
                      margin: '32px',
                      backgroundSize: 'cover'
                    }}
                  />
                )}
              </Motion>
              <Text
                size="large"
                text={'^^ Touch album ^^'}
                isBlur={isPressed}
              />
              <div
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: 'space-around',
                  alignItems: 'center',
                  marginLeft: '-64px',
                  marginRight: '-64px',
                  height: '100px'
                }}
              >
                <Button
                  onClick={() =>
                    this.setState({ currentSong: {}, songArray: [] })
                  }
                  secondary
                  text={'Back'}
                  isBlur={isPressed}
                />

                <Button
                  onClick={() => this.setState({ savePlaylist: true })}
                  text={'Save'}
                  isBlur={isPressed}
                />
              </div>
            </ColumnSection>
            <ColumnSection>
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  backgroundColor: `${
                    isPressed && this.isAccept({ x, appWidth })
                      ? 'green'
                      : 'transparent'
                  }`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    color: `${isPressed ? 'white' : 'transparent'}`,
                    fontSize: '24px',
                    marginTop: '22px',
                    transition: '400ms ease 50ms'
                  }}
                >
                  {'\u2714'}
                </div>
              </div>
            </ColumnSection>
          </FlexBetween>
        </div>
      </AppContainer>
    )
  }
}

const Player = compose(
  withMouseEvent,
  defaultProps({
    savePlaylist: false,
    appWidth: Math.min(420, window.innerWidth),
    songArray: [],
    currentSong: {},
    playlistName: `Sampler ${format(Date.now(), 'MM/DD/YYYY')}`,
    playAudio: false
  }),
  withStateHandlers(
    ({ playlistName }) => ({
      playlistName
    }),
    {
      changePlaylistName: () => event => {
        // eslint-disable-next-line
        event.preventDefault()
        return { playlistName: event.target.value }
      }
    },
    {
      resetAlbumPostion: () => () => ({
        isPressed: false,
        mouseCircleDelta: [0, 0],
        mouseXY: [0, 0]
      })
    },
    {
      savePlaylist: ({ songArray, playlistName }) => event => {
        // eslint-disable-next-line
        event.preventDefault()
        // eslint-disable-next-line fp/no-unused-expression
        storeItem({ key: 'playlistName', item: playlistName })
          .chain(() =>
            storeItem({ key: 'songArray', item: JSON.stringify(songArray) })
          )
          .fork(console.error, redirect('/save'))
        return { saving: true }
      }
    }
  ),
  lifecycle({
    componentDidMount() {
      return getItemFromStorage('token')
        .chain(res => search(res)(window.location.query))
        .fork(
          () => redirect('/'),
          res =>
            res.error
              ? redirect('/')
              : // eslint-disable-next-line fp/no-this
                this.setState({
                  currentSong: res.tracks.items
                    .filter(o => o.preview_url)
                    .map(R.sort((a, b) => a.popularity - b.popularity))
                    .map(R.head),
                  playAudio: true
                })
        )
    }
  }),
  pure,
  branch(
    ({ currentSong }) => R.isEmpty(currentSong),
    renderComponent(() => <div>LOADING</div>)
  )
)(PlayerPure)

export default Player
