import React = require("react")
import Component = React.Component
import {Button} from "react-bootstrap"
import {Base64Img, Center} from "./"
import {screenShareApi} from "../api/screen"
import {helpers} from "../api-layer"
import {tryUntil, clearFunctions} from "../util"

export let screenEvents = {
    frame(data: ScreenTile) {},
    frameData(data: FrameData) {},
    login() {},
    disconnect() {}
}

export function ScreenPage() {
    return <div className="screen-page" style={{height: "100%"}}>
        <ScreenShare />
    </div>
}

interface OffsetCoordinates {
    offsetX: number,
    offsetY: number
}

//let img = new Image()

class ScreenShare extends Component<{}, {
    hasFrame?: boolean
    frame?: string,
    screenWidth?: number,
    screenHeight?: number
}> {
    canvas: HTMLCanvasElement
    canvasCtx: CanvasRenderingContext2D
    constructor() {
        super()
        this.state = {}
    }
    componentDidMount() {
        screenEvents.frame = (tile: ScreenTile) => {
            if (this.canvasCtx) {
                const {x, y, top, bottom, left, right, image} = tile
                const width = right - left
                const height = bottom - top
                //img.width = width
                //img.height = height

                const img = new Image(width, height)
                
                //img.src = `data:image/jpg;base64,${image}`
                img.src = image
                img.onload = () => {
                    this.canvasCtx.drawImage(img, x, y, width, height)
                    setTimeout(() => {
                        URL.revokeObjectURL(img.src)
                    }, 200)
                }
            }
        }
        screenEvents.frameData = (data: FrameData) => {
            this.setState({
                screenWidth: data.Bounds.Right,
                screenHeight: data.Bounds.Bottom
            })
        }
        screenEvents.login = () => {
            console.log("login")
            tryUntil(() => !!this.state.screenWidth, () => {
                console.log("try")
                screenShareApi.requestFrame()
            })
        }
        screenEvents.disconnect = () => {
            console.log("disconnect")
            this.setState({
                screenWidth: 0,
                screenHeight: 0,
                hasFrame: false
            })
        }
        document.addEventListener("keydown", this.onKeyDown)
        document.addEventListener("keyup", this.onKeyUp)
    }
    componentWillUnmount() {
        clearFunctions(screenEvents)
        document.removeEventListener("keydown", this.onKeyDown)
        document.removeEventListener("keyup", this.onKeyUp)
    }
    cancelEvents(e: React.SyntheticEvent | Event) {
        e.preventDefault()
        e.stopPropagation()
    }
    offsetMouse(e: React.MouseEvent) {
        let target = e.target as HTMLCanvasElement
        let rect = target.getBoundingClientRect()
        _.assign(e, {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        })
        return e as React.MouseEvent & OffsetCoordinates
    }
    onKeyDown = (e: KeyboardEvent) => {
        console.log("key press")
        this.cancelEvents(e)
        screenShareApi.keyDown(e.keyCode)
    }
    onKeyUp = (e: KeyboardEvent) => {
        this.cancelEvents(e)
        screenShareApi.keyUp(e.keyCode)
    }
    processMouse(e: React.MouseEvent) {
        this.cancelEvents(e)
        return this.offsetMouse(e)
    }
    frameImg() {
        let {screenWidth, screenHeight} = this.state
        return <canvas 
            width={screenWidth || "500"}
            height={screenHeight || "500"}
            tabIndex="1"
            ref={(ref) => {
                this.canvas = ref
                if (ref) {
                    this.canvasCtx = ref.getContext("2d")
                }
            }} 
            onMouseMove={(e) => {
                let {offsetX, offsetY} = this.processMouse(e)
                screenShareApi.mouse.move(offsetX, offsetY)
            }}
            onContextMenu={(e) => {
                this.processMouse(e)
                screenShareApi.mouse.rightClick()
            }}
            onClick={(e) => {
                let {offsetX, offsetY} = this.processMouse(e)
                if (e.button == 0) {
                    screenShareApi.mouse.leftClick(offsetX, offsetY)
                }
            }} 
            onMouseDown={(e) => {
                this.processMouse(e)
                screenShareApi.mouse.down()
            }}
            onMouseUp={(e) => {
                this.processMouse(e)
                screenShareApi.mouse.up()
            }}
            onWheel={(e)=> {
                this.processMouse(e)
                screenShareApi.mouse.wheel(e.deltaY/20)
            }}
        />
    }
    connected() {
        if (this.state.screenWidth) {
            return <div className="proxima-nova-14">
                Connected &nbsp; 
                <span style={{color: "green"}} className="glyphicon glyphicon-record"/>
                <button className="text-button" onClick={helpers.stopScreenShare}>disconnect</button>
            </div>
        }
         return <div className="proxima-nova-14">
            Not Connected &nbsp; <span style={{color: "red"}} className="glyphicon glyphicon-record"/>
        </div>
    }
    frame() {
        if (this.state.screenWidth) {
            return <div className="fixed">{this.frameImg()}</div>
        }
        return <Center noHeight style={{flexGrow: 1}}>
            <p>Not connected to Screen Share.</p>
            <button className="btn btn-primary text-button" onClick={() => {
                helpers.startScreenShare(screenShareApi.login)
            }}>Connect</button>
        </Center>
    }
    render() {
        return <div className="ulterius-panel" style={{height: "100%"}}>
            <div className="double-header">
                <div>screen share</div>
                {this.connected()}
            </div>
            {this.frame()}
            {/* 
            <Button onClick={() => {
                screenShareApi.login()
            }}>Connect</Button>
            <br />
            <Button onClick={() => {
                screenShareApi.requestFrame()
            }}/>
            */}
        </div>
    }
}