import io.github.piscescup.interval.IntervalType;
import io.github.piscescup.interval.primitive.IntInterval;

public class IntervalChecks {
    public static void main(String[] args) {
        IntInterval range = IntInterval.of(1, 10, IntervalType.CLOSED_OPEN_INTERVAL);

        boolean containsOne = range.contains(1);
        boolean containsTen = range.contains(10);
        String display = range.formattedString();

        System.out.println(containsOne);
        System.out.println(containsTen);
        System.out.println(display);
    }
}
