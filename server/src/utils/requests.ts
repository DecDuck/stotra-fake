import yahooFinance from "yahoo-finance2";
import Cache from "node-cache";
import axios from "axios";
import moment from "moment";
const stockCache = new Cache({ stdTTL: 60 }); // 1 minute

import dotenv from "dotenv";
import Stock from "../models/stock.model";
dotenv.config();

interface Stock {
	symbol: string;
	longName: string;
	regularMarketPrice: number;
	regularMarketPreviousClose: number;
	regularMarketChangePercent: number;
}

interface HistoricalStock {
	symbol: string;
	date: number;
	close: number;
}

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const randomLetter = () =>
	letters[Math.floor(Math.random() * 1000) % letters.length];

const now = new Date().getTime();
const day = 1000 * 60 * 60 * 24;

(async () => {
	const length = await Stock.countDocuments();
	if (length == 0) {
		const numberOfSeeds = 100;
		for (let i = 0; i < numberOfSeeds; i++) {
			const symbol = `${randomLetter()}${randomLetter()}${randomLetter()}${randomLetter()}`;
			const fullName = `${symbol} Holdings, Inc...`;
			const historical: Array<number[]> = Array(600)
				.fill(0)
				.map((_, i) => {
					const then = now - day * (i / 2);
					return [then, Math.random() * 100];
				})
				.sort((a, b) => b[0] - a[0]);

			const stock = new Stock({ symbol, longName: fullName, historical });
			await stock.save();
		}
	}
})();

export const fetchStockData = async (symbol: string): Promise<any> => {
	const cacheKey = symbol + "-quote";

	try {
		if (stockCache.has(cacheKey)) {
			return stockCache.get(cacheKey);
		} else {
			const stockData = await Stock.findOne({ symbol: symbol });
			if (!stockData) return undefined;
			const dflt = [new Date().getTime(), 0];
			const mostRecent = stockData.historical[0] ?? dflt;
			const secondMostRecent = stockData.historical[1] ?? dflt;

			const percentDifference =
				((mostRecent[1] - secondMostRecent[1]) / secondMostRecent[1]) * 100 ??
				-Infinity;

			const results: Stock = Object.assign({}, stockData.toObject(), {
				regularMarketPrice: mostRecent[1],
				regularMarketPreviousClose: secondMostRecent[1],
				regularMarketChangePercent: percentDifference,
				historical: [],
			});

			stockCache.set(cacheKey, results);
			return results;
		}
	} catch (err: any) {
		console.error(err);
		console.error("Error fetching " + symbol + " stock data:", err);
		throw new Error(err);
	}
};

export const fetchHistoricalStockData = async (
	symbol: string,
	period: "1d" | "5d" | "1m" | "6m" | "YTD" | "1y" | "all" = "1d"
): Promise<any> => {
	const periodTerm =
		period === "1d" || period === "5d" || period === "1m" ? "short" : "long";
	const cacheKey = symbol + "-historical-" + periodTerm;

	try {
		if (stockCache.has(cacheKey)) {
			return stockCache.get(cacheKey);
		} else {
			const stockData = await Stock.findOne({ symbol: symbol });
			if (!stockData) return [];

			let end = 0;
			if (period.endsWith("d")) {
				const amount = parseInt(period.slice(0, -1));
				end = moment().subtract(amount, "day").unix();
			} else if (period.endsWith("m")) {
				const amount = parseInt(period.slice(0, -1));
				end = moment().subtract(amount, "month").unix();
			} else if (period === "YTD") {
				const beginning = new Date();
				beginning.setUTCDate(1);
				beginning.setUTCMonth(0);
				beginning.setHours(0, 0, 0, 0);
				end = beginning.getTime();
			} else if (period.endsWith("y")) {
				const amount = parseInt(period.slice(0, -1));
				end = moment().subtract(amount, "year").unix();
			}

			let formattedData: number[][] = stockData.historical
				.filter((e) => e[0] > end)
				.reverse();
			console.log(formattedData);
			stockCache.set(cacheKey, formattedData);
			return formattedData;
		}
	} catch (error) {
		console.error("Error fetching " + symbol + " historical data:", error);
		return null;
	}
};

export const searchStocks = async (query: string): Promise<any> => {
	const results = await Stock.find({
		$text: {
			$search: query,
			$caseSensitive: false,
			$diacriticSensitive: false,
		},
	}).limit(10);

	return results;
};
