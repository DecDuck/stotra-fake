import { Schema, Document, model } from "mongoose";

export interface IStock extends Document {
	symbol: string;
	longName: string;
	historical: Array<[number, number]>;
	_doc: any;
}

export const StockSchema = new Schema<IStock>({
	symbol: {
		type: String,
		required: true,
		uppercase: true, // Ensure symbols are stored in uppercase
		trim: true, // Remove any potential whitespace
		index: true,
	},
	longName: {
		type: String,
		required: true,
		trim: true,
		index: true,
	},
	historical: {
		type: [[Number]],
		required: true,
	},
});
StockSchema.index({ symbol: "text", longName: "text" });

// 3. Create a Model.
const Stock = model<IStock>("Stock", StockSchema);

export default Stock;
