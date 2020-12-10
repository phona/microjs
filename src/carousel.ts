import iter from './helps/iter'
import Loop from './helps/loop'
import Iter from './helps/iter/iter'

interface Image {
	src: string;
	url: string;
}

interface Button {
	on: string;
	off: string;
}

export default class Carousel<T> {
	private intervalHandler: number;
	private imgElem: HTMLImageElement;
	private imgButtonElems: HTMLImageElement[];
	private isStarted: boolean;
	private currentIndex: number;
	private loop: Loop<number>;

	public constructor(
		target: Element,
		private images: Array<Image>,
		private button: Button,
		private breaktime: number,
	) {
		this.intervalHandler = -1
		this.isStarted = false
		this.imgElem = document.createElement("img")
		this.imgElem.src = images[0].src
		this.loop = new Loop(Iter.fromRange(0, images.length))
		this.currentIndex = this.loop.next();

		target.appendChild(this.imgElem)

		const buttonGroupDiv = document.createElement('div')
		target.appendChild(buttonGroupDiv)
		this.imgButtonElems = new iter.Iter(images)
			.map(() => {
				const elem = document.createElement('img')
				buttonGroupDiv.appendChild(elem)
				elem.src = button.off
				return elem
			})
			.collect();
	}

	public start() {
		this.intervalHandler = setInterval(() => {
			this.imgButtonElems[this.currentIndex].src = this.button.off
			this.currentIndex = this.loop.next()
			this.imgButtonElems[this.currentIndex].src = this.button.on
			const image = this.images[this.currentIndex]
			this.imgElem.src = image.src
			this.imgElem.src = image.url
		}, this.breaktime);
		this.isStarted = true;
	}

	public getCurrent(): Image {
		return this.images[this.currentIndex]
	}

	public stop() {
		if (!this.isStarted) {
			return
		}

		clearInterval(this.intervalHandler)
	}
}
